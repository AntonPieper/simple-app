import Fastify from "fastify";
import FastifyHelmet from "@fastify/helmet";
import FastifyWebsocket from "@fastify/websocket";
import postgres from "postgres";
import {
  Type,
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from "@fastify/type-provider-typebox";
import "dotenv/config";
import { IncomingMessage, ServerResponse } from "http";
const env = process.env.NODE_ENV ?? "development";
const logLevel = process.env.LOG_LEVEL ?? "info";
const port = parseInt(process.env.PORT ?? "8080");
const host = process.env.HOST ?? "localhost";

const fastify = Fastify({
  logger: (() => {
    switch (env) {
      case "development":
        return {
          level: logLevel,
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        };
      case "production":
        return true;
      default:
        return false;
    }
  })(),
})
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider<TypeBoxTypeProvider>();

fastify.register(FastifyHelmet);
fastify.register(FastifyWebsocket);

const sql = postgres({
  debug(connection, query, parameters, paramTypes) {
    fastify.log.debug({ connection, query, parameters, paramTypes });
  },
});
fastify.addHook("onClose", async () => {
  return sql.end();
});

const IdParamSchema = Type.Object({ id: Type.Number() });

// -- Routes --

type Client = {
  index: number;
  stream: ServerResponse<IncomingMessage>;
};

const clients: Client[][] = [];
fastify.get(
  "/:id",
  { schema: { params: IdParamSchema } },
  async (req, reply) => {
    const answer =
      await sql`SELECT count FROM clicks WHERE id = ${req.params.id}`;
    if (answer.length === 0) {
      return null;
    }
    const counterID = req.params.id;
    if (counterID >= clients.length) {
      clients.length = counterID + 1;
      clients[counterID] = [];
    }
    const client: Client = {
      index: clients[counterID].length,
      stream: reply.raw,
    };
    clients[counterID].push(client);
    client.stream.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    });
    req.raw.on("close", () => {
      const listeners = clients[counterID];
      const last = listeners[listeners.length - 1];
      last.index = client.index;
      listeners[client.index] = last;
    });
    client.stream.write(answer[0].count);
  },
);

fastify.post("/:id/add", { schema: { params: IdParamSchema } }, async (req) => {
  const id = req.params.id;
  const result =
    await sql`UPDATE clicks SET count = count + 1 WHERE id = ${id} RETURNING count`;
  if (clients[id] !== undefined) {
    for (const row of result) {
      for (const client of clients[id]) {
        client.stream.write(row.count.toString());
      }
    }
  }
  return result.length > 0;
});

fastify.listen({ port, host }, (err) => {
  if (err !== null) {
    fastify.log.error(err);
    process.exit(1);
  }
});
