// Unit tests for server.mjs's pure helpers (issue #41). No network, no server —
// these import the functions directly (the main-module guard makes that safe)
// and lock in the behavior that a string of bug-fix PRs accreted branches into:
// extractResultUrls result shapes, Suno take naming, error classification,
// filename/dir hygiene, poll budgets, prompt caps, and duration coercion.
//
// Run: npm test   (or: node --test)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

import {
  extractResultUrls,
  classifyKieCode,
  sanitizeFilename,
  resolveOutputDir,
  pollBudgetMs,
  validateModelOptions,
  getCostEstimate,
  formatCost,
  coerceDuration,
  sunoTrackName,
  collectUrls,
  normalizeTaskState,
  parseTaskLog,
  resolveVoice,
  PROMPT_CAPS,
  RAW_DIR,
  MODEL_REGISTRY,
  VIDEO_MODEL_REGISTRY,
} from '../server.mjs';

test('extractResultUrls — all known result shapes', async (t) => {
  await t.test('resultJson.resultUrls (market/veo)', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ resultUrls: ['a', 'b'] }) }), ['a', 'b']);
  });
  await t.test('resultJson.result_urls (gpt-4o snake_case)', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ result_urls: ['x'] }) }), ['x']);
  });
  await t.test('resultObject.mask_urls (omnihuman subject-detection)', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ resultObject: { mask_urls: ['m1', 'm2'] } }) }), ['m1', 'm2']);
  });
  await t.test('resultObject.url', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ resultObject: { url: 'u' } }) }), ['u']);
  });
  await t.test('resultImageUrl (flux kontext)', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ resultImageUrl: 'img' }) }), ['img']);
  });
  await t.test('bare-string resultJson that is a URL', () => {
    assert.deepEqual(extractResultUrls({ resultJson: 'https://x/y.png' }), ['https://x/y.png']);
  });
  await t.test('videoInfo.videoUrl (runway)', () => {
    assert.deepEqual(extractResultUrls({ videoInfo: { videoUrl: 'v' } }), ['v']);
  });
  await t.test('top-level resultUrls array', () => {
    assert.deepEqual(extractResultUrls({ resultUrls: ['r'] }), ['r']);
  });
  await t.test('deduplicates', () => {
    assert.deepEqual(extractResultUrls({ resultJson: JSON.stringify({ resultUrls: ['a', 'a'] }), url: 'a' }), ['a']);
  });
  await t.test('empty when nothing present', () => {
    assert.deepEqual(extractResultUrls({}), []);
  });
});

test('sunoTrackName — never collapses takes onto one path (issue #23)', () => {
  // filename WITH extension
  assert.equal(sunoTrackName('song.mp3', 0), 'song.mp3');
  assert.equal(sunoTrackName('song.mp3', 1), 'song-2.mp3');
  // filename WITHOUT extension — the original regression
  assert.equal(sunoTrackName('song', 0), 'song.mp3');
  assert.equal(sunoTrackName('song', 1), 'song-2.mp3');
  // different extension than the default is preserved
  assert.equal(sunoTrackName('clip.wav', 0, 'mp3'), 'clip.wav');
  assert.equal(sunoTrackName('clip.wav', 1, 'mp3'), 'clip-2.wav');
  // take 0 and take 1 must differ regardless of input shape
  for (const name of ['a', 'a.mp3', 'a.b.mp3', 'track.WAV']) {
    assert.notEqual(sunoTrackName(name, 0), sunoTrackName(name, 1), `takes differ for ${name}`);
  }
});

test('classifyKieCode — retryable vs fatal buckets (issue #25)', () => {
  assert.equal(classifyKieCode(429), 'retryable');
  assert.equal(classifyKieCode(455), 'retryable');
  assert.equal(classifyKieCode(500), 'retryable');
  assert.equal(classifyKieCode(500, 'server is busy, please try again later'), 'retryable');
  assert.equal(classifyKieCode(402), 'fatal-client');
  assert.equal(classifyKieCode(401), 'fatal-client');
  assert.equal(classifyKieCode(422), 'fatal-client');
  assert.equal(classifyKieCode(433), 'fatal-client');
  // kie overloads 500 for validation — message disambiguates
  assert.equal(classifyKieCode(500, 'This field is required'), 'fatal-client');
  assert.equal(classifyKieCode(500, 'resolution is not within the range of allowed options'), 'fatal-client');
  // unknown codes default retry-safe
  assert.equal(classifyKieCode(418), 'retryable');
});

test('sanitizeFilename — strips directory components / traversal (issue #24)', () => {
  assert.equal(sanitizeFilename('foo.png'), 'foo.png');
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFilename('/abs/path/x.mp3'), 'x.mp3');
  assert.equal(sanitizeFilename('a/b/c.mp4'), 'c.mp4');
  assert.equal(sanitizeFilename(undefined), undefined);
  assert.equal(sanitizeFilename(null), null);
});

test('resolveOutputDir — absolute required, mkdir, default (issue #24)', () => {
  assert.equal(resolveOutputDir({}), RAW_DIR, 'defaults to RAW_DIR');
  assert.equal(resolveOutputDir(undefined), RAW_DIR);
  assert.throws(() => resolveOutputDir({ download_dir: 'relative/dir' }), /absolute/, 'relative rejected');
  const abs = join(tmpdir(), `kie-unit-${process.pid}-${Math.floor(process.hrtime()[1])}`);
  try {
    assert.equal(resolveOutputDir({ download_dir: abs }), abs);
    assert.ok(existsSync(abs), 'creates the directory');
  } finally {
    rmSync(abs, { recursive: true, force: true });
  }
});

test('pollBudgetMs — per-call > env > default precedence (issue #22)', () => {
  const saved = process.env.KIE_POLL_BUDGET_IMAGE;
  try {
    delete process.env.KIE_POLL_BUDGET_IMAGE;
    assert.equal(pollBudgetMs('image', {}), 600000, 'image default 600s');
    assert.equal(pollBudgetMs('video', {}), 900000, 'video default 900s');
    assert.equal(pollBudgetMs('speech', {}), 300000, 'speech default 300s');
    // per-call wins and is clamped to [30, 3600]
    assert.equal(pollBudgetMs('image', { max_wait_seconds: 120 }), 120000);
    assert.equal(pollBudgetMs('image', { max_wait_seconds: 5 }), 30000, 'clamped to 30s min');
    assert.equal(pollBudgetMs('image', { max_wait_seconds: 99999 }), 3600000, 'clamped to 3600s max');
    // env overrides default but not per-call
    process.env.KIE_POLL_BUDGET_IMAGE = '111';
    assert.equal(pollBudgetMs('image', {}), 111000, 'env override');
    assert.equal(pollBudgetMs('image', { max_wait_seconds: 60 }), 60000, 'per-call beats env');
  } finally {
    if (saved === undefined) delete process.env.KIE_POLL_BUDGET_IMAGE;
    else process.env.KIE_POLL_BUDGET_IMAGE = saved;
  }
});

test('coerceDuration — matches each spec type (issue #28)', () => {
  const strSpec = { type: 'string', enum: ['5', '10'] };
  const numSpec = { type: 'number', min: 3, max: 15 };
  assert.deepEqual(coerceDuration(strSpec, 5), { value: '5' }, 'number → string');
  assert.deepEqual(coerceDuration(numSpec, '5'), { value: 5 }, 'string → number');
  assert.deepEqual(coerceDuration(numSpec, 8), { value: 8 }, 'number stays number');
  assert.ok(coerceDuration(numSpec, 'abc').error, 'non-number → error for numeric spec');
  assert.deepEqual(coerceDuration(undefined, 5), { value: 5 }, 'no spec passes through');
  assert.deepEqual(coerceDuration(numSpec, undefined), { value: undefined }, 'undefined passes through');
  // enum of all-strings is treated as wanting strings even without type
  assert.deepEqual(coerceDuration({ enum: ['6', '10'] }, 6), { value: '6' });
});

test('validateModelOptions — prompt caps, aspect ratios, enums (issues #27, #4)', () => {
  // qwen2/text-to-image (image registry) caps at 800 via PROMPT_CAPS
  const qwen2 = MODEL_REGISTRY['qwen2/text-to-image'];
  assert.ok(qwen2, 'qwen2 entry exists');
  const overLimit = 'x'.repeat(900);
  const err = validateModelOptions(qwen2, { prompt: overLimit }, {}, 'qwen2/text-to-image');
  assert.match(err || '', /800/, 'flags the 800-char cap');
  // under limit passes
  assert.equal(validateModelOptions(qwen2, { prompt: 'short' }, {}, 'qwen2/text-to-image'), null);
  // aspect ratio not in the model's list
  const withAR = { aspectRatios: ['16:9', '1:1'], options: {} };
  assert.match(validateModelOptions(withAR, { aspect_ratio: '21:9' }, {}) || '', /aspect_ratio/);
  // option enum violation
  const withEnum = { options: { resolution: { type: 'string', enum: ['720p', '1080p'] } } };
  assert.match(validateModelOptions(withEnum, {}, { resolution: '480p' }) || '', /resolution/);
  // numeric min/max
  const withNum = { options: { duration: { type: 'number', min: 3, max: 15 } } };
  assert.match(validateModelOptions(withNum, {}, { duration: 99 }) || '', /above max/);
  assert.match(validateModelOptions(withNum, {}, { duration: 1 }) || '', /below min/);
});

test('PROMPT_CAPS — documented values are present and sane', () => {
  assert.equal(PROMPT_CAPS['qwen2/text-to-image'], 800);
  assert.equal(PROMPT_CAPS['bytedance/seedance-2'], 20000);
  assert.equal(PROMPT_CAPS['hailuo/02-text-to-video-pro'], 1500);
  for (const [slug, cap] of Object.entries(PROMPT_CAPS)) {
    assert.ok(Number.isInteger(cap) && cap > 0, `${slug} cap is a positive integer`);
  }
});

test('getCostEstimate — free, estimate label, per-second', () => {
  assert.equal(getCostEstimate('omnihuman-1-5/subject-detection'), 'free (0 credits)', 'zero-priced → free');
  assert.equal(getCostEstimate('does-not-exist'), null, 'unknown → null');
  assert.match(getCostEstimate('nano-banana-2'), /credits/, 'image flat rate');
  const est = getCostEstimate('happyhorse-1-1/text-to-video', 5);
  assert.match(est, /for 5s/, 'per-second includes duration');
  assert.match(est, /estimate/, 'PRICING_ESTIMATED entry is labeled');
});

test('formatCost — actual creditsConsumed beats estimate (issue #42)', () => {
  // actual present → uses it, tagged [actual]
  assert.match(formatCost('nano-banana-2', { creditsConsumed: 4 }), /^4 credits .* \[actual\]$/);
  // actual 0 (free) is still reported as actual, not skipped
  assert.match(formatCost('omnihuman-1-5/subject-detection', { creditsConsumed: 0 }), /^0 credits .* \[actual\]$/);
  // per-second actual differs from the default-config estimate — the #42 example
  // (seedance-2-mini 480p charged 38, table default is 720p at 20.5/s)
  const s = formatCost('bytedance/seedance-2-mini', { creditsConsumed: 38 }, 4);
  assert.match(s, /^38 credits .* \[actual\]$/);
  // no actual → falls back to the labeled estimate
  assert.match(formatCost('nano-banana-2', {}), /credits/);
  assert.match(formatCost('nano-banana-2', {}), /~/, 'estimate keeps the ~ prefix');
  // unknown model, no actual → 'unknown'
  assert.equal(formatCost('does-not-exist', {}), 'unknown');
});

test('formatCost — logs [pricing-drift] only when >25% off table (issue #42/#44)', () => {
  const logs = [];
  const orig = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  try {
    // nano-banana-2 table = 4; actual 4 → no drift
    formatCost('nano-banana-2', { creditsConsumed: 4 });
    // actual 8 vs table 4 → 100% drift → logged
    formatCost('nano-banana-2', { creditsConsumed: 8 });
  } finally {
    console.error = orig;
  }
  assert.equal(logs.filter((l) => l.includes('[pricing-drift]')).length, 1, 'exactly one drift log');
  assert.match(logs.find((l) => l.includes('[pricing-drift]')), /nano-banana-2/);
});

test('collectUrls — gathers http(s) URLs from nested records (issue #53)', () => {
  // WAV shape: single URL under response
  assert.deepEqual(collectUrls({ audioWavUrl: 'https://x/a.wav' }), ['https://x/a.wav']);
  // vocal-removal shape: top-level URLs + nested originData[].audio_url, nulls skipped
  const vr = {
    originUrl: null,
    vocalUrl: 'https://x/v.mp3',
    instrumentalUrl: 'https://x/i.mp3',
    drumsUrl: null,
    originData: [{ audio_url: 'https://x/v.mp3' }, { audio_url: 'https://x/i.mp3' }],
  };
  const urls = collectUrls(vr);
  assert.ok(urls.includes('https://x/v.mp3') && urls.includes('https://x/i.mp3'), 'finds both stems');
  assert.ok(!urls.includes(null), 'skips nulls');
  // non-URL strings ignored
  assert.deepEqual(collectUrls({ a: 'not a url', b: 42, c: 'ftp://x/y' }), []);
  assert.deepEqual(collectUrls(null), []);
});

test('extractResultUrls — specialized Suno record via response (issue #53)', () => {
  assert.deepEqual(extractResultUrls({ response: { audioWavUrl: 'https://x/a.wav' } }), ['https://x/a.wav']);
  // vocal-removal: dedupes the duplicated top-level + originData URLs
  const rec = { response: { vocalUrl: 'https://x/v.mp3', instrumentalUrl: 'https://x/i.mp3', originData: [{ audio_url: 'https://x/v.mp3' }] } };
  const out = extractResultUrls(rec);
  assert.equal(out.length, 2, 'two unique stems');
  // must NOT hijack a normal sunoData response
  assert.deepEqual(extractResultUrls({ response: { sunoData: [{ id: 1 }] } }), []);
});

test('normalizeTaskState — every record shape → one word (issue #53)', () => {
  assert.equal(normalizeTaskState({ state: 'success' }), 'success');
  assert.equal(normalizeTaskState({ status: 'SUCCESS' }), 'success');
  assert.equal(normalizeTaskState({ status: 'GENERATE_AUDIO_FAILED' }), 'fail');
  assert.equal(normalizeTaskState({ status: 'PENDING' }), 'generating');
  assert.equal(normalizeTaskState({ successFlag: 1 }), 'success', 'veo numeric');
  assert.equal(normalizeTaskState({ successFlag: 2 }), 'fail', 'veo numeric fail');
  assert.equal(normalizeTaskState({ successFlag: 'SUCCESS' }), 'success', 'specialized string');
  assert.equal(normalizeTaskState({ successFlag: 'PENDING' }), 'generating', 'specialized pending');
  assert.equal(normalizeTaskState({ errorCode: 'X' }), 'fail');
  // Voice API uses lowercase statuses (#20)
  assert.equal(normalizeTaskState({ status: 'success' }), 'success', 'voice lowercase success');
  assert.equal(normalizeTaskState({ status: 'processing_validate_fail' }), 'fail', 'voice fail variant');
  assert.equal(normalizeTaskState({ status: 'wait_validating' }), 'generating', 'voice mid-flow');
  assert.equal(normalizeTaskState({}), 'generating', 'unknown → generating');
});

test('parseTaskLog — dedupe by taskId (last wins), skip junk, cap (issue #43)', () => {
  const log = [
    JSON.stringify({ taskId: 'a', status: 'polling', filename: 'a.png' }),
    'not json — skip me',
    JSON.stringify({ taskId: 'b', status: 'polling' }),
    JSON.stringify({ taskId: 'a', status: 'downloaded', filename: 'a.png' }), // supersedes first 'a'
    '',
  ].join('\n');
  const out = parseTaskLog(log);
  assert.equal(out.length, 2, 'two distinct tasks');
  const a = out.find((e) => e.taskId === 'a');
  assert.equal(a.status, 'downloaded', 'last write for a taskId wins (terminal status)');
  // dedup keeps the LATEST position (chronological), so a moves after b
  assert.deepEqual(out.map((e) => e.taskId), ['b', 'a']);
  // cap keeps the most recent N
  const many = Array.from({ length: 50 }, (_, i) => JSON.stringify({ taskId: `t${i}` })).join('\n');
  const capped = parseTaskLog(many, 10);
  assert.equal(capped.length, 10);
  assert.equal(capped[capped.length - 1].taskId, 't49', 'keeps newest');
  assert.deepEqual(parseTaskLog(''), [], 'empty → empty');
});

test('resolveVoice — name/id acceptance + catalog on miss (issues #26, 4.0.5)', () => {
  const id = resolveVoice('Bella');
  assert.ok(typeof id === 'string' && id.length > 0, 'resolves a known name to an id');
  assert.equal(resolveVoice(id), id, 'passes through a valid id');
  assert.throws(() => resolveVoice('DefinitelyNotARealVoiceName'), /allowed voice set/, 'unknown throws with catalog');
});
