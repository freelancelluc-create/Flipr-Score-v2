/**
 * POST /api/waitlist — Lista de espera (señal de interés para validar el MVP).
 * Body: { email, source? }
 */

import { json, readBody, clientIp } from "../lib/http.js";
import { kv, rateLimit } from "../lib/kv.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, { ok: false }, 405);

  const rl = await rateLimit(`wl:${clientIp(req)}`, 10, 3600);
  if (!rl.allowed) return json(res, { ok: false, reason: "rate-limited" }, 429);

  const body = (await readBody(req, 10_000)) || {};
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL.test(email)) return json(res, { ok: false, reason: "bad-email" }, 400);

  const added = await kv(["SADD", "waitlist", email]);
  if (added === 1) {
    const source = String(body.source || "").slice(0, 40);
    await kv(["LPUSH", "waitlist:log", JSON.stringify({ email, source, ts: Date.now() })]);
  }
  return json(res, { ok: true });
}
