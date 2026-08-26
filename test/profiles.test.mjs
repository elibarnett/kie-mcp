// Profile referential integrity (issue #91). Profiles are knowledge files that
// rot as the catalog churns — these tests make them break loudly instead of
// silently recommending removed models or nonexistent tools.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, inferProfile } from '../data/profiles/index.mjs';
import { MODEL_REGISTRY, VIDEO_MODEL_REGISTRY, renderProfileBrief } from '../server.mjs';

const knownModel = (id) => !!(MODEL_REGISTRY[id] || VIDEO_MODEL_REGISTRY[id]);

// Snake_case tokens in workflow steps that are NOT tool names (option/param vocab).
const NON_TOOL_SNAKE = new Set(['prompt_extend', 'image_urls', 'video_urls', 'mask_indexs', 'image_edit', 'text_to_image', 'model_options', 'aspect_ratio', 'first_frame_url', 'last_frame_url', 'file_path', 'base64_data', 'og_image', 'safe_zone']);
const TOOL_NAMES = new Set([
  'generate_image', 'generate_video', 'generate_music', 'generate_sfx', 'generate_tts', 'generate_gemini_tts',
  'upload_file', 'download_result', 'check_task', 'list_tasks', 'list_models', 'check_credits',
  'grok_segment_map', 'grok_image_edit', 'seedream_layer_decompose',
  'veo_extend', 'veo_upscale_1080p', 'veo_upscale_4k', 'runway_extend', 'profile_brief',
]);

for (const [id, p] of Object.entries(PROFILES)) {
  test(`profile ${id} — required fields`, () => {
    for (const f of ['id', 'name', 'media', 'summary', 'lastReviewed', 'intake', 'routing']) {
      assert.ok(p[f], `missing ${f}`);
    }
    assert.equal(p.id, id);
    assert.ok(!Number.isNaN(Date.parse(p.lastReviewed)), 'lastReviewed must be a date');
    assert.ok(p.intake.length >= 3, 'intake should carry real questions');
    for (const q of p.intake) assert.ok(q.ask && q.why, 'every intake question needs ask + why');
  });

  test(`profile ${id} — routing references only registry models`, () => {
    for (const route of p.routing) {
      for (const [tier, t] of Object.entries(route.tiers)) {
        if (t.tool) {
          assert.ok(TOOL_NAMES.has(t.tool), `${route.deliverable}/${tier}: unknown tool "${t.tool}"`);
          continue;
        }
        assert.ok(knownModel(t.model), `${route.deliverable}/${tier}: unknown model "${t.model}"`);
      }
    }
  });

  test(`profile ${id} — promptFormulas perModel keys exist in registries`, () => {
    for (const f of Object.values(p.promptFormulas || {})) {
      for (const m of Object.keys(f.perModel || {})) {
        assert.ok(knownModel(m), `perModel references unknown model "${m}"`);
      }
    }
  });

  test(`profile ${id} — workflow steps name only real tools`, () => {
    for (const w of p.workflows || []) {
      for (const step of w.steps) {
        for (const tok of step.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) || []) {
          if (NON_TOOL_SNAKE.has(tok) || knownModel(tok)) continue;
          assert.ok(TOOL_NAMES.has(tok), `workflow "${w.name}" mentions unknown tool-like token "${tok}"`);
        }
      }
    }
  });

  test(`profile ${id} — brief renders and flags nothing paused`, () => {
    const brief = renderProfileBrief(p, 'test request');
    assert.ok(brief.includes(p.name));
    assert.ok(brief.includes('Intake'));
    assert.ok(!brief.includes('UNKNOWN MODEL'), 'brief contains an unknown model flag');
    assert.ok(!brief.includes('PAUSED'), 'brief recommends a paused model');
  });
}

test('inferProfile — architecture keywords route to architecture', () => {
  const r = inferProfile('I need a render of a house facade for a client');
  assert.equal(r[0]?.id, 'architecture');
  assert.equal(inferProfile('completely unrelated request about sandwiches').length, 0);
});
