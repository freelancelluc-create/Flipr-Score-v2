import { test } from "node:test";
import assert from "node:assert/strict";
import { niceRound, normalizeRange, buildPricePlan, comparableLinks } from "../src/lib/pricing.js";

test("niceRound produce precios de anuncio creíbles", () => {
  assert.equal(niceRound(13.4), 13);
  assert.equal(niceRound(347), 345);
  assert.equal(niceRound(733), 730);
  assert.equal(niceRound(1260), 1250);
  assert.equal(niceRound(4120), 4100);
  assert.equal(niceRound(0), 0);
  assert.equal(niceRound("abc"), 0);
});

test("normalizeRange rechaza valores inválidos y ordena el rango", () => {
  assert.equal(normalizeRange(null, 100), null);
  assert.equal(normalizeRange(0, 100), null);
  assert.equal(normalizeRange(-5, 100), null);
  assert.deepEqual(normalizeRange(400, 300), { low: 300, high: 400, wide: false });
  assert.equal(normalizeRange(100, 300).wide, true);
});

test("buildPricePlan mantiene el orden suelo ≤ justo ≤ publicar ≤ máximo", () => {
  for (const [lo, hi] of [[330, 390], [15, 22], [900, 1400], [50, 50], [2000, 6000]]) {
    const p = buildPricePlan(lo, hi);
    assert.ok(p.floor === p.quick);
    assert.ok(p.quick <= p.fair, `${lo}-${hi}: quick ${p.quick} > fair ${p.fair}`);
    assert.ok(p.fair <= p.listAt, `${lo}-${hi}: fair ${p.fair} > listAt ${p.listAt}`);
    assert.ok(p.listAt <= p.max, `${lo}-${hi}: listAt ${p.listAt} > max ${p.max}`);
  }
});

test("buildPricePlan: ejemplo concreto de iPhone", () => {
  const p = buildPricePlan(330, 390);
  assert.equal(p.quick, 330);
  assert.equal(p.fair, 360);
  assert.equal(p.listAt, 390);
  assert.deepEqual(p.schedule.map((s) => s.day), [0, 7, 14]);
});

test("el calendario de bajadas no repite precios cuando el rango es estrecho", () => {
  const p = buildPricePlan(50, 50);
  assert.equal(p.schedule.length, 1);
  assert.equal(p.schedule[0].price, 50);
});

test("comparableLinks codifica la búsqueda", () => {
  const links = comparableLinks("iPhone 13 & funda");
  assert.equal(links.length, 3);
  assert.ok(links[0].url.includes("iPhone%2013%20%26%20funda"));
  assert.deepEqual(comparableLinks("  "), []);
});
