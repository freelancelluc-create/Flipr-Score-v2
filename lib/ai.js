/**
 * Llamada al modelo de IA (OpenRouter u OpenAI) pidiendo respuesta JSON.
 *
 * Proveedor según las variables de entorno:
 *   - OPENROUTER_API_KEY  (+ OPENROUTER_MODEL, por defecto openai/gpt-4o-mini)
 *   - OPENAI_API_KEY      (+ OPENAI_MODEL, por defecto gpt-4o-mini)
 *   - FLIPR_MOCK_AI=1     → respuesta de ejemplo, para desarrollar sin clave.
 */

/** Extrae el primer objeto JSON balanceado de un texto (tolera ```json y texto extra). */
export function extractJsonObject(text) {
  if (!text) return null;
  const t = String(text).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(t.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const MOCK = {
  identified: true,
  product: "iPhone 13 128 GB",
  category: "Smartphones",
  priceLow: 330,
  priceHigh: 390,
  confidence: "alta",
  confidenceReason: "Modelo muy común con muchas ventas recientes y precio estable.",
  missing: "",
  demand: "alta",
  timeToSell: "3-7 días",
  reasons: [
    "Es uno de los iPhone más vendidos de segunda mano: hay mucha oferta y el precio está muy ajustado.",
    "El estado de la batería influye mucho: por encima del 85% puedes pedir la parte alta del rango.",
  ],
  listingTitle: "iPhone 13 128GB - Muy buen estado",
  listingDescription:
    "Vendo iPhone 13 de 128 GB en muy buen estado.\nSiempre con funda y protector, sin golpes.\nLibre de operador, funciona perfectamente.\nEntrego en mano o envío.",
  photoTips: [
    "Foto frontal con la pantalla encendida para demostrar que funciona.",
    "Captura de Ajustes > Batería mostrando la salud de la batería.",
  ],
  searchQuery: "iphone 13 128gb",
};

export async function chatJson({ prompt, imageDataUrl = null, timeoutMs = 30000 }) {
  if (process.env.FLIPR_MOCK_AI === "1") return { ok: true, data: MOCK };

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openrouterKey && !openaiKey) return { ok: false, reason: "no-key" };

  const useOpenRouter = !!openrouterKey;
  const endpoint = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const model = useOpenRouter
    ? process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
  const headers = {
    Authorization: `Bearer ${useOpenRouter ? openrouterKey : openaiKey}`,
    "Content-Type": "application/json",
    ...(useOpenRouter ? { "HTTP-Referer": "https://fliprscore.com", "X-Title": "FLIPR" } : {}),
  };

  const content = imageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
      ]
    : prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });
    if (!resp.ok) return { ok: false, reason: `api-error:${resp.status}` };
    const data = await resp.json();
    const parsed = extractJsonObject(data?.choices?.[0]?.message?.content || "");
    return parsed ? { ok: true, data: parsed } : { ok: false, reason: "unparsed" };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}
