/**
 * Construcción del prompt y saneado de la respuesta de la IA (puro, testeable).
 *
 * La IA NUNCA decide sola lo que ve el usuario: aquí validamos cada campo,
 * recortamos textos, calculamos el plan de precios con pricing.js y rebajamos
 * la confianza cuando el rango es demasiado amplio.
 */

import { CONDITIONS, PLATFORMS, buildPricePlan, comparableLinks } from "./pricing.js";

const CONFIDENCE = ["alta", "media", "baja"];
const DEMAND = ["alta", "media", "baja"];

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cleanMultiline = (v, max) =>
  String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const cleanList = (v, n, max) =>
  (Array.isArray(v) ? v : []).map((x) => clean(x, max)).filter(Boolean).slice(0, n);
const oneOf = (v, list, fallback) => {
  const s = String(v ?? "").trim().toLowerCase();
  return list.find((x) => x.toLowerCase() === s) ?? fallback;
};

/** Normaliza la entrada del usuario (lo que llega del formulario). */
export function normalizeInput(body = {}) {
  const image = typeof body.imageDataUrl === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(body.imageDataUrl)
    ? body.imageDataUrl
    : null;
  return {
    product: clean(body.product, 120),
    condition: oneOf(body.condition, CONDITIONS, "Muy buen estado"),
    details: cleanMultiline(body.details, 600),
    platform: oneOf(body.platform, PLATFORMS, "Wallapop"),
    imageDataUrl: image,
  };
}

export function buildPrompt({ product, condition, details, platform, imageDataUrl }) {
  return `Eres un tasador experto del mercado de segunda mano en España (Wallapop, Vinted, Milanuncios).
Un particular quiere VENDER un producto. Estima el rango de precio al que este producto SE VENDE de verdad hoy en España de segunda mano, en el estado indicado. Ojo: el precio de venta real suele ser más bajo que el precio al que se anuncia.

Reglas:
- Si no puedes identificar el producto con precisión suficiente para darle precio (falta modelo, capacidad, talla, año...), pon "identified": false y explica en "missing" qué dato falta.
- Sé honesto con la confianza: "alta" solo en productos muy comunes y con precio estable (móviles, consolas, portátiles conocidos); "baja" en productos raros, de coleccionismo, artesanales o muy dependientes del estado.
- No inventes características que no aparezcan en los datos del usuario o en la foto.
- Anuncio en español de España: título de máximo 50 caracteres con marca y modelo; descripción honesta de 3 a 6 líneas que mencione el estado real y lo que incluye. Sin emojis.
${imageDataUrl ? "- Se adjunta una foto del producto: úsala para identificar el modelo y el estado visible.\n" : ""}
DATOS DEL VENDEDOR
Producto: ${product || "(ver foto)"}
Estado: ${condition}
Detalles: ${details || "(ninguno)"}
Plataforma: ${platform}

Responde SOLO con JSON válido con esta forma exacta:
{"identified":true,"product":"<marca y modelo identificados>","category":"<categoría corta>","priceLow":<entero en euros>,"priceHigh":<entero en euros>,"confidence":"alta|media|baja","confidenceReason":"<una frase>","missing":"<qué dato falta o cadena vacía>","demand":"alta|media|baja","timeToSell":"<p.ej. 3-7 días>","reasons":["<motivo del precio>","<motivo>"],"listingTitle":"<título>","listingDescription":"<descripción>","photoTips":["<consejo de foto>","<consejo>"],"searchQuery":"<búsqueda corta para encontrar anuncios iguales>"}`;
}

/**
 * Convierte la respuesta cruda de la IA en un resultado seguro para la UI.
 * Devuelve { ok: true, ... } o { ok: false, reason, message }.
 */
export function sanitizeEstimate(raw, input = {}) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "unparsed", message: "No hemos podido calcular el precio. Inténtalo de nuevo." };
  }

  if (raw.identified === false) {
    const missing = clean(raw.missing, 160);
    return {
      ok: false,
      reason: "needs-detail",
      message: missing
        ? `Necesitamos un poco más de detalle: ${missing}`
        : "No hemos identificado el producto. Añade marca y modelo exactos.",
    };
  }

  const plan = buildPricePlan(raw.priceLow, raw.priceHigh);
  if (!plan) {
    return { ok: false, reason: "no-price", message: "No hemos podido estimar un precio fiable para este producto." };
  }

  let confidence = oneOf(raw.confidence, CONFIDENCE, "baja");
  let confidenceReason = clean(raw.confidenceReason, 200);
  if (plan.wide && confidence !== "baja") {
    confidence = "baja";
    confidenceReason = "El rango de precios es muy amplio: compara con anuncios similares antes de publicar.";
  }

  const product = clean(raw.product, 120) || input.product || "Tu producto";
  const searchQuery = clean(raw.searchQuery, 80) || product;

  return {
    ok: true,
    product,
    category: clean(raw.category, 40),
    condition: input.condition || "Muy buen estado",
    platform: input.platform || "Wallapop",
    confidence,
    confidenceReason,
    demand: oneOf(raw.demand, DEMAND, "media"),
    timeToSell: clean(raw.timeToSell, 30),
    reasons: cleanList(raw.reasons, 4, 200),
    plan,
    listing: {
      title: clean(raw.listingTitle, 50) || product.slice(0, 50),
      description: cleanMultiline(raw.listingDescription, 1000),
    },
    photoTips: cleanList(raw.photoTips, 4, 160),
    comparables: comparableLinks(searchQuery),
  };
}
