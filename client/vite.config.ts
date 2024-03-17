import { defineConfig, loadEnv } from "vite";
import solid from "vite-plugin-solid";
declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  console.log("SERVER_URL", process.env.SERVER_URL);
  return {
    plugins: [solid()],
    server: {
      proxy: {
        "/api": {
          target: process.env.SERVER_URL ?? "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
