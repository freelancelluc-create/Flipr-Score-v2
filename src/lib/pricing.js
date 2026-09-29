/**
 * Lógica de precios de venta (pura, sin red ni DOM).
 *
 * A partir de un rango de precio al que se VENDE el producto (low–high),
 * construye un plan de venta: a cuánto publicar, cuál es el precio justo,
 * el mínimo que aceptar y cuándo bajar el precio si no se vende.
 *
 * Se usa tanto en el servidor (api/estimate.js) como en los tests.
 */

export const CONDITIONS = [
  "Nuevo",
  "Como nuevo",
  "Muy buen estado",
  "Buen estado",
  "Aceptable",
  "Para piezas",
];

export const PLATFORMS = ["Wallapop", "Vinted"];

/** Redondea a un precio "de anuncio" creíble (35, 120, 475, 1.250…). */
export function niceRound(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v < 20) return Math.max(1, Math.round(v));
  if (v < 500) return Math.round(v / 5) * 5;
  if (v < 1000) return Math.round(v / 10) * 10;
  if (v < 3000) return Math.round(v / 25) * 25;
  return Math.round(v / 50) * 50;
}

/**
 * Valida y ordena un rango de precios. Devuelve null si no es utilizable.
 * `wide` indica que el rango es tan amplio que la estimación es poco fiable.
 */
export function normalizeRange(low, high) {
  let a = Number(low);
  let b = Number(high);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a <= 0 || b <= 0 || a > 1_000_000 || b > 1_000_000) return null;
  if (a > b) [a, b] = [b, a];
  return { low: Math.round(a), high: Math.round(b), wide: b > a * 2.5 };
}

/**
 * Plan de venta a partir del rango de venta real.
 *  - quick:  precio de venta rápida (se vende en pocos días)
 *  - fair:   precio justo (punto medio del mercado)
 *  - max:    máximo realista si no tienes prisa
 *  - listAt: precio al que publicar (deja margen para el regateo)
 *  - floor:  por debajo de esto, no vendas
 *  - schedule: bajadas de precio sugeridas si no se vende
 */
export function buildPricePlan(low, high) {
  const range = normalizeRange(low, high);
  if (!range) return null;

  const mid = (range.low + range.high) / 2;
  const quick = niceRound(range.low);
  const fair = Math.max(quick, niceRound(mid));
  const max = Math.max(fair, niceRound(range.high));
  // En Wallapop/Vinted casi todo el mundo regatea: publicamos algo por encima
  // del precio justo, sin pasarnos del máximo realista.
  const listAt = Math.max(fair, Math.min(max, niceRound(mid * 1.1)));

  const schedule = [
    { day: 0, price: listAt, label: "Publica a este precio" },
    ...(fair < listAt ? [{ day: 7, price: fair, label: "Sin ofertas serias en una semana: baja a" }] : []),
    ...(quick < fair ? [{ day: 14, price: quick, label: "Dos semanas sin vender: precio de venta rápida" }] : []),
  ];

  return { quick, fair, max, listAt, floor: quick, schedule, wide: range.wide };
}

/** Enlaces de búsqueda para comparar con anuncios reales. */
export function comparableLinks(query) {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return [];
  return [
    { platform: "Wallapop", url: `https://es.wallapop.com/app/search?keywords=${q}` },
    { platform: "Vinted", url: `https://www.vinted.es/catalog?search_text=${q}` },
    { platform: "eBay (vendidos)", url: `https://www.ebay.es/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1` },
  ];
}
