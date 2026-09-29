/**
 * Utilidades HTTP para serverless functions con la firma clásica `(req, res)`.
 */

export function json(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

/** Lee el header Authorization. */
export function bearer(req) {
  const h = (req && req.headers && req.headers.authorization) || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

/** Lee y parsea el cuerpo JSON (usa req.body si existe; si no, lee el stream con límite). */
export async function readBody(req, maxBytes = 6_000_000) {
  if (req && req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let data = "";
    let aborted = false;
    req.on("data", (c) => {
      if (aborted) return;
      data += c;
      if (data.length > maxBytes) {
        aborted = true;
        resolve(null);
      }
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

/** IP del cliente según los headers de Vercel. */
export function clientIp(req) {
  const h = (req && req.headers) || {};
  return h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
}
