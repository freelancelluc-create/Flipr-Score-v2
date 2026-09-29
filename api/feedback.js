/**
 * POST /api/feedback — ¿Te parece acertado el precio?
 * Body: { id, vote: "ok" | "high" | "low" }
 */

import { json, readBody, clientIp } from "../lib/http.js";
import { kv, rateLimit } from "../lib/kv.js";

const VOTES = ["ok", "high", "low"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, { ok: false }, 405);

  const rl = await rateLimit(`fb:${clientIp(req)}`, 30, 3600);
  if (!rl.allowed) return json(res, { ok: false, reason: "rate-limited" }, 429);

  const body = (await readBody(req, 10_000)) || {};
  const vote = String(body.vote || "");
  const id = String(body.id || "");
  if (!VOTES.includes(vote) || !UUID.test(id)) return json(res, { ok: false, reason: "bad-input" }, 400);

  // Un voto por estimación: SET NX evita inflar las métricas.
  const first = await kv(["SET", `fb:${id}`, vote, "NX", "EX", String(60 * 60 * 24 * 90)]);
  if (first === "OK") {
    await kv(["INCR", `stats:feedback:${vote}`]);
    await kv(["LPUSH", "feedback", JSON.stringify({ id, vote, ts: Date.now() })]);
  }
  return json(res, { ok: true });
}
