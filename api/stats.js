/**
 * GET /api/stats — Métricas de validación del MVP (solo admin).
 * Header: Authorization: Bearer <ADMIN_TOKEN>
 */

import { timingSafeEqual } from "node:crypto";
import { json, bearer } from "../lib/http.js";
import { kv } from "../lib/kv.js";

function isAdmin(req) {
  const expected = process.env.ADMIN_TOKEN || "";
  const given = bearer(req);
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const num = (v) => Number(v) || 0;

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, { ok: false, reason: "unauthorized" }, 401);

  const [estimates, ok, high, low, waitlist, recent] = await Promise.all([
    kv(["GET", "stats:estimates"]),
    kv(["GET", "stats:feedback:ok"]),
    kv(["GET", "stats:feedback:high"]),
    kv(["GET", "stats:feedback:low"]),
    kv(["SCARD", "waitlist"]),
    kv(["LRANGE", "estimates", "0", "29"]),
  ]);

  const votes = num(ok) + num(high) + num(low);
  return json(res, {
    ok: true,
    estimates: num(estimates),
    feedback: { ok: num(ok), high: num(high), low: num(low), accuracy: votes ? Math.round((num(ok) / votes) * 100) : null },
    waitlist: num(waitlist),
    recent: (recent || []).map((r) => {
      try { return JSON.parse(r); } catch { return null; }
    }).filter(Boolean),
  });
}
