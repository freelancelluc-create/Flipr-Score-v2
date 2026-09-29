/** Llamadas del navegador a la API. Nunca lanzan: devuelven { ok:false, message }. */

async function postJson(path, body) {
  try {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    return data || { ok: false, message: "Respuesta inesperada del servidor." };
  } catch {
    return { ok: false, message: "Sin conexión. Revisa tu internet e inténtalo de nuevo." };
  }
}

export const estimate = (input) => postJson("/api/estimate", input);
export const sendFeedback = (id, vote) => postJson("/api/feedback", { id, vote });
export const joinWaitlist = (email, source) => postJson("/api/waitlist", { email, source });
