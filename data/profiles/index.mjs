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

export const PROFILES = Object.fromEntries(
  [architecture].map((p) => [p.id, p]),
);

// Cheap keyword inference for profile_brief calls that pass a request but no
// profile. Returns [{id, score}] sorted desc; the agent can override — the
// brief labels the pick as an inference, never a fact.
const KEYWORDS = {
  architecture: ['architect', 'building', 'house', 'facade', 'interior', 'render', 'floor plan', 'site plan', 'elevation', 'room', 'furniture', 'real estate', 'construction', 'apartment', 'kitchen', 'bathroom', 'landscape design'],
};

export function inferProfile(request) {
  const text = String(request || '').toLowerCase();
  const scores = Object.entries(KEYWORDS)
    .map(([id, words]) => ({ id, score: words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scores;
}
