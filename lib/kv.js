/**
 * Cliente mínimo de Vercel KV / Upstash Redis vía REST (sin dependencias).
 * Si no hay credenciales configuradas, todas las operaciones son no-op y
 * devuelven null: la app funciona igual, solo que sin guardar métricas.
 */

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function kvConfigured() {
  return !!config();
}

/** Ejecuta un comando Redis: kv(["INCR", "clave"]). Devuelve `result` o null. */
export async function kv(command) {
  const c = config();
  if (!c) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(c.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    return data ? data.result : null;
  } catch (e) {
    console.log("kv error", e && e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rate limit por ventana fija con INCR + EXPIRE (atómico en Redis).
 * Si KV no está configurado, permite siempre (no rompe el desarrollo local).
 */
export async function rateLimit(id, max, windowSecs) {
  const key = `rl:${id}:${Math.floor(Date.now() / 1000 / windowSecs)}`;
  const count = await kv(["INCR", key]);
  if (count === null) return { allowed: true };
  if (count === 1) await kv(["EXPIRE", key, String(windowSecs)]);
  return { allowed: count <= max };
}
