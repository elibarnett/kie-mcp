// Unit tests for the drift-watch pure parsers (issue #44).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractGroups, extractPricing, parseCredits, advertisedRates, priceMatches, classifyProbe } from '../scripts/drift-watch.mjs';

test('extractGroups — parses market groups from embedded JSON', () => {
  const html = 'x &quot;groupName&quot;:&quot;Nano Banana 2 Lite&quot;,&quot;count&quot;:1,&quot;path&quot;:&quot;nano-banana-2-lite&quot; y';
  assert.deepEqual(extractGroups(html), [{ name: 'Nano Banana 2 Lite', path: 'nano-banana-2-lite' }]);
  // already-decoded quotes work too, and dupes collapse
  const raw = '"groupName":"Veo 3","count":2,"path":"veo-3" and "groupName":"Veo 3","count":2,"path":"veo-3"';
  assert.equal(extractGroups(raw).length, 1);
});

test('extractPricing — maps apiModel → pricingDesc', () => {
  const html = '"apiDocumentUrl":"https://docs.kie.ai/market/nano-banana-2-lite","pricingDesc":"4 credits ($0.02)"';
  assert.deepEqual(extractPricing(html), { 'nano-banana-2-lite': '4 credits ($0.02)' });
});

test('parseCredits — first credits number, any format', () => {
  assert.equal(parseCredits('4 credits ($0.02) for 1K'), 4);
  assert.equal(parseCredits('22.5 credits/s ($0.1125) for 720p'), 22.5);
  assert.equal(parseCredits('no price here'), null);
});

test('advertisedRates + priceMatches — tolerate tiers and per-clip units (issue #44)', () => {
  // HappyHorse 1.1: table 29 (1080p) IS in the multi-tier desc → no drift
  const hh = '22.5 credits/s ($0.1125) for 720 p or 29 credits/s ($0.145) for 1080 p';
  assert.ok(advertisedRates(hh).includes(29));
  assert.ok(priceMatches(29, hh), 'matches 1080p tier');
  assert.ok(priceMatches(22.5, hh), 'matches 720p tier');
  // Kling per-clip: "160 credits (5-second)" → 32/s, table 32 matches
  const kling = 'A 5-second video costs 160 credits ($0.80), and a 10-second video costs 320 credits';
  assert.ok(advertisedRates(kling).includes(32), 'derives per-second from per-clip');
  assert.ok(priceMatches(32, kling));
  // Genuine drift: table 8 matches none of the advertised 28/48 → flagged
  const drift = '28 credits/s ($0.14) for 720 p or 48 credits/s ($0.24) for 1080 p';
  assert.ok(!priceMatches(8, drift), 'real drift not silenced');
});

test('classifyProbe — routed error = alive; only not-found/paused flagged', () => {
  assert.equal(classifyProbe({ code: 500, msg: 'This field is required' }), 'healthy');
  assert.equal(classifyProbe({ code: 422, msg: 'prompt exceeds range' }), 'healthy');
  assert.equal(classifyProbe({ code: 500, msg: 'some weird new error' }), 'healthy', 'unknown errors mean the slug still routed');
  assert.equal(classifyProbe({ code: 500, msg: 'This interface is temporarily paused' }), 'paused');
  assert.equal(classifyProbe({ code: 404, msg: 'model not found' }), 'gone');
  assert.equal(classifyProbe({ code: 400, msg: 'invalid model' }), 'gone');
});
