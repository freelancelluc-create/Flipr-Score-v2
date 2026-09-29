/**
 * POST /api/estimate — ¿A cuánto vendo esto?
 *
 * Body: { product, condition, details?, platform?, imageDataUrl? }
 * Devuelve el plan de precios, el anuncio listo y enlaces para comparar.
 *
 * Cada estimación se guarda (sin datos personales) en KV: es el inicio de
 * nuestra propia base de datos de precios, la ventaja que la v1 no tenía.
 */

import { randomUUID } from "node:crypto";
import { json, readBody, clientIp } from "../lib/http.js";
import { kv, rateLimit } from "../lib/kv.js";
import { chatJson } from "../lib/ai.js";
import { normalizeInput, buildPrompt, sanitizeEstimate } from "../src/lib/estimate.js";

const ERROR_MESSAGES = {
  "no-key": "El servicio de estimación no está configurado todavía.",
  timeout: "La estimación ha tardado demasiado. Vuelve a intentarlo.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, { ok: false, reason: "method-not-allowed" }, 405);

  const rl = await rateLimit(`est:${clientIp(req)}`, 15, 3600);
  if (!rl.allowed) {
    return json(res, { ok: false, reason: "rate-limited", message: "Has hecho muchas consultas seguidas. Prueba de nuevo en un rato." }, 429);
  }

  const body = await readBody(req);
  if (!body) return json(res, { ok: false, reason: "too-large", message: "La foto es demasiado grande." }, 413);

  const input = normalizeInput(body);
  if (!input.product && !input.imageDataUrl) {
    return json(res, { ok: false, reason: "no-input", message: "Escribe qué quieres vender o sube una foto." }, 400);
  }

  const ai = await chatJson({ prompt: buildPrompt(input), imageDataUrl: input.imageDataUrl });
  if (!ai.ok) {
    console.log("estimate ai error", ai.reason);
    return json(res, {
      ok: false,
      reason: ai.reason,
      message: ERROR_MESSAGES[ai.reason] || "No hemos podido calcular el precio. Inténtalo de nuevo.",
    }, ai.reason === "no-key" ? 503 : 502);
  }

  const result = sanitizeEstimate(ai.data, input);
  if (!result.ok) return json(res, result, 200);

  const id = randomUUID();
  await kv(["INCR", "stats:estimates"]);
  await kv(["LPUSH", "estimates", JSON.stringify({
    id,
    ts: Date.now(),
    query: input.product,
    product: result.product,
    category: result.category,
    condition: result.condition,
    platform: result.platform,
    withPhoto: !!input.imageDataUrl,
    low: result.plan.quick,
    high: result.plan.max,
    confidence: result.confidence,
  })]);
  await kv(["LTRIM", "estimates", "0", "19999"]);

  return json(res, { ...result, id });
}
