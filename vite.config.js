import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * En desarrollo, sirve las funciones de /api igual que Vercel en producción,
 * para que `npm run dev` funcione sin instalar la CLI de Vercel.
 */
function devApi() {
  return {
    name: "flipr-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z-]+)(?:\?|$)/.exec(req.url || "");
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`);
          await mod.default(req, res);
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, reason: "dev-error" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Carga .env.local (y .env.mock con `npm run dev:mock`) en process.env para la API.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  if (mode === "mock") process.env.FLIPR_MOCK_AI = "1";
  return { plugins: [react(), tailwindcss(), devApi()] };
});
