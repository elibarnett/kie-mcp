// Vertical profiles (issue #91) — per-domain intake, model routing, and
// prompting intelligence. Each profile briefs the CALLING AGENT: what a
// professional in the vertical would ask, which models fit which deliverable
// at which budget tier, and how to write the prompt for the chosen model.
//
// Contract (enforced by test/profiles.test.mjs):
//   - every routing tier's `model` exists in MODEL_REGISTRY / VIDEO_MODEL_REGISTRY
//   - every tool named in workflow steps exists in the tool list
//   - required fields: id, name, media, summary, lastReviewed, intake, routing
import architecture from './architecture.mjs';
import gameAssets from './game-assets.mjs';
import advertising from './advertising.mjs';
import webProduct from './web-product.mjs';

export const PROFILES = Object.fromEntries(
  [architecture, gameAssets, advertising, webProduct].map((p) => [p.id, p]),
);

// Cheap keyword inference for profile_brief calls that pass a request but no
// profile. Returns [{id, score}] sorted desc; the agent can override — the
// brief labels the pick as an inference, never a fact.
const KEYWORDS = {
  architecture: ['architect', 'building', 'house', 'facade', 'interior', 'render', 'floor plan', 'site plan', 'elevation', 'room', 'furniture', 'real estate', 'construction', 'apartment', 'kitchen', 'bathroom', 'landscape design'],
  'game-assets': ['game', 'sprite', 'pixel art', 'character sheet', 'tileset', 'tileable', 'texture', 'unity', 'godot', 'unreal', 'rpg', 'platformer', 'skybox', 'game icon', 'npc', 'level', 'key art'],
  advertising: ['ad', 'advert', 'campaign', 'banner', 'social post', 'instagram', 'marketing', 'brand', 'product shot', 'packshot', 'billboard', 'promo', 'cta', 'a/b', 'story cover', 'thumbnail'],
  'web-product': ['empty state', 'onboarding', 'landing page', 'hero image', 'og image', 'og:image', 'favicon', 'illustration for', 'feature section', 'ui illustration', 'saas', 'app icon', 'icon set', 'icons', '404', 'dashboard', 'web app', 'website'],
};

export function inferProfile(request) {
  const text = String(request || '').toLowerCase();
  const scores = Object.entries(KEYWORDS)
    .map(([id, words]) => ({ id, score: words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scores;
}
