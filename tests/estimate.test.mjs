import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeInput, buildPrompt, sanitizeEstimate } from "../src/lib/estimate.js";
import { extractJsonObject } from "../lib/ai.js";

const GOOD = {
  identified: true,
  product: "iPhone 13 128 GB",
  priceLow: 330,
  priceHigh: 390,
  confidence: "Alta",
  demand: "alta",
  reasons: ["a", "", "b"],
  listingTitle: "x".repeat(80),
  listingDescription: "Línea 1\n\n\n\nLínea 2",
  photoTips: [],
  searchQuery: "iphone 13 128gb",
};

test("normalizeInput recorta, valida estado/plataforma y descarta imágenes no válidas", () => {
  const i = normalizeInput({
    product: "  iPhone   13 ",
    condition: "inventado",
    platform: "vinted",
    imageDataUrl: "javascript:alert(1)",
  });
  assert.equal(i.product, "iPhone 13");
  assert.equal(i.condition, "Muy buen estado");
  assert.equal(i.platform, "Vinted");
  assert.equal(i.imageDataUrl, null);
  assert.ok(normalizeInput({ imageDataUrl: "data:image/jpeg;base64,AAAA" }).imageDataUrl);
});

test("buildPrompt incluye los datos del vendedor y menciona la foto solo si la hay", () => {
  const input = normalizeInput({ product: "PS5", condition: "Buen estado", details: "2 mandos" });
  const p = buildPrompt(input);
  assert.ok(p.includes("Producto: PS5") && p.includes("Estado: Buen estado") && p.includes("2 mandos"));
  assert.ok(!p.includes("Se adjunta una foto"));
  assert.ok(buildPrompt({ ...input, imageDataUrl: "data:image/jpeg;base64,A" }).includes("Se adjunta una foto"));
});

test("sanitizeEstimate: respuesta correcta", () => {
  const r = sanitizeEstimate(GOOD, { condition: "Buen estado", platform: "Wallapop" });
  assert.equal(r.ok, true);
  assert.equal(r.confidence, "alta");
  assert.equal(r.plan.listAt, 390);
  assert.deepEqual(r.reasons, ["a", "b"]);
  assert.equal(r.listing.title.length, 50);
  assert.equal(r.listing.description, "Línea 1\n\nLínea 2");
  assert.equal(r.condition, "Buen estado");
  assert.equal(r.comparables.length, 3);
});

test("sanitizeEstimate: pide más detalle si no identifica el producto", () => {
  const r = sanitizeEstimate({ identified: false, missing: "la capacidad" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "needs-detail");
  assert.ok(r.message.includes("la capacidad"));
});

test("sanitizeEstimate: sin precio válido no inventa nada", () => {
  for (const bad of [{ ...GOOD, priceLow: null }, { ...GOOD, priceHigh: "mucho" }, { ...GOOD, priceLow: -3 }, null, "texto"]) {
    assert.equal(sanitizeEstimate(bad).ok, false);
  }
});

test("sanitizeEstimate: rango muy amplio baja la confianza", () => {
  const r = sanitizeEstimate({ ...GOOD, priceLow: 100, priceHigh: 600 });
  assert.equal(r.confidence, "baja");
});

test("extractJsonObject tolera markdown y llaves dentro de strings", () => {
  assert.deepEqual(extractJsonObject('```json\n{"a":"}{","b":1}\n```'), { a: "}{", b: 1 });
  assert.deepEqual(extractJsonObject('Aquí tienes: {"x":{"y":2}} gracias'), { x: { y: 2 } });
  assert.equal(extractJsonObject("sin json"), null);
});
