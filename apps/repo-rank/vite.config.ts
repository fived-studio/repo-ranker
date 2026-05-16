import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");

export default defineConfig(({ mode }) => {
  // Load .env files from the workspace root, not just the app folder.
  const env = loadEnv(mode, workspaceRoot, "");
  const port = Number(env.VITE_PORT ?? env.PORT ?? 5173);
  const apiTarget = env.API_URL ?? `http://localhost:${env.API_PORT ?? 8080}`;
  const apiKey = env.API_KEY;

  return {
    base: env.BASE_PATH ?? "/",
    envDir: workspaceRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
      dedupe: ["react", "react-dom"],
    },
    build: { outDir: "dist/public", emptyOutDir: true },
    server: {
      port,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            // Inject x-api-key on every proxied request so the secret
            // never has to live in the browser.
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) proxyReq.setHeader("x-api-key", apiKey);
            });
          },
        },
      },
    },
    preview: { port, host: "0.0.0.0" },
  };
});
