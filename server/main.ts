import Fastify from "fastify";
import FastifyHelmet from "@fastify/helmet";
import postgres from "postgres";
import {
  Type,
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from "@fastify/type-provider-typebox";
import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
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

function sslMode() {
  switch (process.env.PGSSLMODE) {
    case "allow":
    case "prefer":
    case "require":
    case "verify-full":
      return process.env.PGSSLMODE;
    default:
      return undefined;
  }
}
const sql = postgres({
  debug(connection, query, parameters, paramTypes) {
    fastify.log.debug({ connection, query, parameters, paramTypes });
  },
  ssl: sslMode(),
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
    fastify.log.trace("Got request");
    const answer =
      await sql`SELECT count FROM clicks WHERE id = ${req.params.id}`;
    fastify.log.trace("Selected clicks");
    const counterID = req.params.id;
    if (answer.length === 0) {
      fastify.log.trace("No clicks");
      reply.status(404);
      return `ID ${counterID} not found`;
    }
    if (counterID >= clients.length) {
      clients.length = counterID + 1;
    }
    clients[counterID] ??= [];
    const client: Client = {
      index: clients[counterID].length,
      stream: reply.raw,
    };
    clients[counterID].push(client);
    fastify.log.trace(`Writing head for ${client.index}`);
    client.stream.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    });
    req.raw.on("close", () => {
      fastify.log.debug(`Closing ${client.index}`);
      const listeners = clients[counterID];
      const last = listeners[listeners.length - 1];
      last.index = client.index;
      listeners[client.index] = last;
    });
    fastify.log.debug(`[Initial] Sending ${answer[0].count}...`);
    client.stream.write(`data: ${answer[0].count}\n\n`);
  }
);

fastify.post("/:id/add", { schema: { params: IdParamSchema } }, async (req) => {
  const id = req.params.id;
  const result =
    await sql`UPDATE clicks SET count = count + 1 WHERE id = ${id} RETURNING count`;
  if (clients[id] !== undefined) {
    for (const row of result) {
      for (const client of clients[id]) {
        fastify.log.debug(`[Broadcast] Sending ${row.count}...`);
        client.stream.write(`data: ${row.count}`);
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
