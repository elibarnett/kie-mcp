#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync, readFileSync } from 'fs';
import { join, basename, isAbsolute } from 'path';
import { createServer } from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { realpathSync } from 'fs';

import { ELEVENLABS_VOICES, DEFAULT_VOICE_ID } from './data/voices.mjs';
import { PRICING, PRICING_ESTIMATED, PROMPT_CAPS } from './data/pricing.mjs';
import { MODEL_REGISTRY } from './data/registry-image.mjs';
import { VIDEO_MODEL_REGISTRY } from './data/registry-video.mjs';
import { AUDIO_TOOLS_REGISTRY } from './data/registry-audio.mjs';

// True when this file is the process entrypoint (`node server.mjs`, `npx
// kie-mcp`, a global bin, …), false when imported by tests. Gates the side
// effects — the missing-key exit and the transport startup — so the module can
// be imported to unit-test the pure helpers. See issue #41.
//
// Must resolve symlinks on BOTH sides: npx and global installs launch via a bin
// symlink (`.bin/kie-mcp -> ../kie-mcp/server.mjs`), so process.argv[1] is the
// symlink path while import.meta.url is the realpath. A plain === compare fails
// there and the transport never starts — i.e. the server silently appears
// "down" for every npx user (regression that shipped 4.4.2–4.6.2).
function isEntrypoint(argv1, importMetaUrl) {
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return argv1 === fileURLToPath(importMetaUrl);
  }
}
const isMainModule = isEntrypoint(process.argv[1], import.meta.url);

const API_BASE = 'https://api.kie.ai';
const API_KEY = process.env.KIE_API_KEY;
const PROJECT_ROOT = process.env.KIE_PROJECT_ROOT || process.cwd();
const RAW_DIR = join(PROJECT_ROOT, 'kie/assets/raw');
// kie.ai rejects (some) Suno generation requests without a callBackUrl even
// though results are equally available by polling. We poll, so the callback
// only needs to exist as a field — set KIE_CALLBACK_URL to receive real ones.
const SUNO_CALLBACK_URL = process.env.KIE_CALLBACK_URL || 'https://example.com/kie-mcp-callback';

// kie.ai restricts ElevenLabs TTS/dialogue to this curated voice set —
// arbitrary ElevenLabs voice IDs are rejected with "This voice is not
// within the range of allowed options". Catalog scraped from
// docs.kie.ai/market/elevenlabs/text-to-speech-turbo-2-5 (2026-06-11);
// both TTS models and text-to-dialogue-v3 share it.

// Accepts a curated voice ID or case-insensitive voice name ("Bella",
// "Viking Bjorn"). Throws with the full catalog on a miss so tool callers
// can self-correct without burning a kie request.
function resolveVoice(value) {
  if (!value) return DEFAULT_VOICE_ID;
  const v = String(value).trim();
  if (ELEVENLABS_VOICES.some((x) => x.id === v)) return v;
  const byName = ELEVENLABS_VOICES.find((x) => x.name.toLowerCase() === v.toLowerCase());
  if (byName) return byName.id;
  const catalog = ELEVENLABS_VOICES.map((x) => `${x.name}${x.vibe ? ` — ${x.vibe}` : ''} (${x.id})`).join('\n');
  throw new Error(`Voice "${value}" is not in kie.ai's allowed voice set (arbitrary ElevenLabs voice IDs are rejected upstream). Pick a name or ID from:\n${catalog}`);
}

if (isMainModule && !API_KEY) {
  console.error('KIE_API_KEY environment variable is required');
  process.exit(1);
}

if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });

// Per-call output directory (issue #24). The MCP server's cwd is not the
// caller's — agents in other worktrees need downloads landing in THEIR tree.
function resolveOutputDir(args) {
  const dir = args?.download_dir;
  if (!dir) return RAW_DIR;
  if (typeof dir !== 'string' || !isAbsolute(dir)) {
    throw new Error(`download_dir must be an absolute path (got ${JSON.stringify(dir)}). The MCP server's working directory is not the caller's, so a relative path is ambiguous — pass the full path.`);
  }
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Strip any directory components a caller sneaks into filename (also blocks ../ traversal).
function sanitizeFilename(name) {
  return name == null ? name : basename(String(name));
}

// Normalize + validate base64 before sending it to kie's uploader, whose atob()
// rejects anything non-conformant with an opaque doubled "Base64 decoding
// failed" error (issue #62). Handles the real-world ways a payload arrives
// dirty: a `data:<mime>;base64,` prefix, whitespace/newlines inserted by
// encoders or the MCP transport, and base64url (`-`/`_`). Returns
// { data, ext } on success or { error } with an actionable message — so a
// truncated/corrupt payload gets a clear "re-send / use file_url" hint instead
// of kie's soup.
function normalizeBase64(input) {
  if (typeof input !== 'string' || !input) return { error: 'base64_data is empty.' };
  let s = input;
  let ext = null;
  const dataUri = s.match(/^data:([\w.+-]+\/([\w.+-]+));base64,(.*)$/s);
  if (dataUri) { ext = dataUri[2].replace('jpeg', 'jpg').replace('mpeg', 'mp3'); s = dataUri[3]; }
  s = s.replace(/\s+/g, '');           // drop wrapping/newlines/spaces
  s = s.replace(/-/g, '+').replace(/_/g, '/');  // base64url → base64
  const body = s.replace(/=+$/, '');
  const bad = body.match(/[^A-Za-z0-9+/]/);
  if (bad) {
    return { error: `base64_data has an invalid character (${JSON.stringify(bad[0])}) at position ${bad.index} — it was likely corrupted in transit. Re-send the exact base64, or use file_url with a public URL instead.` };
  }
  if (s.length % 4 !== 0) {
    return { error: `base64_data length is ${s.length}, not a multiple of 4 — the payload was likely truncated in transit (tool arguments above ~11.7K chars are unreliable, #68). Use file_path with the local file's absolute path instead — the server reads the bytes itself, immune to truncation.` };
  }
  return { data: s, ext };
}

// ─── Pricing Reference ───
// 1 credit ≈ $0.005 USD. Costs are approximate and may vary with bulk discounts (10% bonus at high tiers).
// Video costs scale with duration — listed cost is per-second unless noted as flat.

// Models whose PRICING numbers are inferred rather than officially disclosed by kie.ai.
// Surfaced as "(estimate — pricing not officially disclosed)" in cost display so users
// know not to budget against it exactly.
//
// Veo family: numbers above are empirically measured (2026-06-01) on a single config
// (8s 720p 16:9 T2V with audio). Kept in PRICING_ESTIMATED because the per-second rate
// MAY vary across other resolutions/durations/aspect ratios — we only probed one
// config per tier. HappyHorse + Gemini Omni rates were never officially disclosed by
// kie.ai (research-derived); flagged for the same reason.


// Prompt length caps per API slug, scraped from docs.kie.ai schema maxLength
// fields on 2026-07-11 (issue #27) — kie rejects over-limit prompts with a
// bare 422, so we enforce them client-side with a clear message instead.
// Absent = docs state no limit; per-entry maxPromptChars (set inline in the
// registry) takes precedence over this table. Only documented values here —
// no guesses.

function getCostEstimate(modelId, durationSec) {
  const perUnit = PRICING[modelId];
  if (perUnit === 0) return 'free (0 credits)';
  if (!perUnit) return null;
  const note = PRICING_ESTIMATED.has(modelId) ? ' (estimate — pricing not officially disclosed)' : '';
  // Image models and flat-rate entries
  if (!durationSec) return `~${perUnit} credits (~$${(perUnit * 0.005).toFixed(3)})${note}`;
  // Per-second video models
  const total = Math.round(perUnit * durationSec);
  return `~${total} credits (~$${(total * 0.005).toFixed(2)}) for ${durationSec}s${note}`;
}

// Cost line for a COMPLETED task. Prefers the actual `creditsConsumed` kie
// reports (ground truth — varies with the real resolution/duration/config) over
// the PRICING-table estimate, which is wrong whenever the caller deviates from
// the default config (issue #42). Falls back to the labeled estimate when the
// field is absent. Logs a [pricing-drift] warning when actual diverges >25% from
// the table so the registry numbers can be corrected (feeds the drift watch, #44).
function formatCost(modelId, pollResult, durationSec) {
  const actual = pollResult?.creditsConsumed;
  if (typeof actual === 'number') {
    const perUnit = PRICING[modelId];
    if (typeof perUnit === 'number' && perUnit > 0) {
      const expected = durationSec ? Math.round(perUnit * durationSec) : perUnit;
      if (expected > 0 && Math.abs(actual - expected) / expected > 0.25) {
        console.error(`[pricing-drift] ${modelId}: actual ${actual} cr vs table ${expected} cr${durationSec ? ` (${perUnit}/s × ${durationSec}s)` : ''}`);
      }
    }
    return `${actual} credits (~$${(actual * 0.005).toFixed(3)}) [actual]`;
  }
  return getCostEstimate(modelId, durationSec) || 'unknown';
}

// Coerce a duration value to the type a model's `options.duration` spec declares
// (issue #28). Returns { value } on success, or { error } when a numeric spec
// receives a non-number. A null/undefined spec or value passes the raw through.
function coerceDuration(durSpec, raw) {
  if (!durSpec || raw === undefined || raw === null) return { value: raw };
  const wantsString = durSpec.type === 'string' || (durSpec.enum?.length && durSpec.enum.every((e) => typeof e === 'string'));
  if (wantsString) return { value: String(raw) };
  const n = Number(raw);
  if (Number.isNaN(n)) return { error: `duration ${JSON.stringify(raw)} is not a number.` };
  return { value: n };
}

// Validate user-supplied args/model_options against the model's declared schema.
// Returns null if OK, or an error string describing the first violation.
// Runs the cheap checks the MCP SDK's low-level Server doesn't enforce: aspectRatios
// membership, options-level enum / min / max, and per-model prompt length caps
// (`modelDef.maxPromptChars`). Keeps API roundtrips for real failures.
function validateModelOptions(modelDef, args, model_options, modelId) {
  if (modelDef.aspectRatios?.length && args.aspect_ratio && !modelDef.aspectRatios.includes(args.aspect_ratio)) {
    return `aspect_ratio "${args.aspect_ratio}" not supported by this model. Allowed: ${modelDef.aspectRatios.join(', ')}`;
  }
  // Entries without an explicit apiModel use their registry key as the API slug
  const promptCap = modelDef.maxPromptChars ?? PROMPT_CAPS[modelDef.apiModel] ?? PROMPT_CAPS[modelId];
  if (promptCap && typeof args.prompt === 'string' && args.prompt.length > promptCap) {
    return `prompt exceeds this model's documented max of ${promptCap} chars (got ${args.prompt.length}) — kie.ai would reject it with a bare 422. Shorten the prompt or pick a model with a higher cap (seedance-2 family takes 20000).`;
  }
  const opts = modelDef.options || {};
  for (const [k, spec] of Object.entries(opts)) {
    const v = model_options?.[k];
    if (v === undefined || v === null) continue;
    if (spec.enum?.length) {
      // duration enums are commonly strings; compare loosely against the string form too
      if (!spec.enum.includes(v) && !spec.enum.includes(String(v))) {
        return `model_options.${k} = ${JSON.stringify(v)} not in allowed values: ${spec.enum.map(e => JSON.stringify(e)).join(', ')}`;
      }
    }
    if (spec.type === 'number' && typeof v === 'number') {
      if (typeof spec.min === 'number' && v < spec.min) return `model_options.${k} = ${v} below min ${spec.min}`;
      if (typeof spec.max === 'number' && v > spec.max) return `model_options.${k} = ${v} above max ${spec.max}`;
    }
  }
  return null;
}

// ─── Model Registry ───
// Each model defines: endpoint, how to build the request body, and valid options.
// Models using the generic createTask endpoint go through /api/v1/jobs/createTask.
// GPT-4o and Flux Kontext have dedicated endpoints.


// ─── Video Model Registry ───
// Video models use either dedicated endpoints or the generic /api/v1/jobs/createTask endpoint.
// Models with type='dedicated' have their own generate + poll endpoints.
// Models with type='market' go through createTask and poll via /api/v1/jobs/recordInfo.

// ─── Audio Tools Registry (metadata for list_models, not for request building) ───

// ─── Helpers ───

// Session task log. In-memory array, mirrored to an append-only JSONL file so
// list_tasks and the recovery path (check_task/download_result) survive a
// server restart — a crash mid-generation is exactly when recovery matters
// (issue #43). Each push and status change appends a line; on load, entries are
// deduped by taskId keeping the last occurrence.
const taskHistory = [];
const TASK_LOG_PATH = join(PROJECT_ROOT, 'kie/assets/task-history.jsonl');
const TASK_LOG_CAP = 500; // entries kept in memory / after compaction

// Parse JSONL task-log text into a deduped, capped, chronological array.
// Pure — the file I/O wrappers below use it, and it's unit-tested. Last write
// for a given taskId wins (captures the terminal status); malformed lines are
// skipped.
function parseTaskLog(text, cap = TASK_LOG_CAP) {
  const byId = new Map();
  const noId = [];
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e && e.taskId != null) { byId.delete(e.taskId); byId.set(e.taskId, e); }
    else if (e) noId.push(e);
  }
  const all = [...noId, ...byId.values()];
  return all.slice(-cap);
}

// Append one entry to the task log; never throws (persistence must not break a
// generation). Best-effort.
function appendTaskLog(entry) {
  try {
    if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
    appendFileSync(TASK_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch { /* best-effort */ }
}

// Push an entry into the in-memory history AND persist it. Replaces bare
// taskHistory.push at every call site.
function trackTask(entry) {
  taskHistory.push(entry);
  appendTaskLog(entry);
  return entry;
}

// Load persisted history into memory at startup, and compact the file if it has
// grown well past the cap. Best-effort; a missing/corrupt file just starts empty.
function loadTaskHistory() {
  try {
    if (!existsSync(TASK_LOG_PATH)) return;
    const text = readFileSync(TASK_LOG_PATH, 'utf8');
    const entries = parseTaskLog(text);
    // Bulk-restore into memory WITHOUT re-appending (these lines are already in
    // the log). NB: must be taskHistory.push, not trackTask — trackTask takes a
    // single entry and re-persists it, which the #43 helper-conversion sed
    // wrongly applied here, so only the first persisted task restored. (#53)
    taskHistory.push(...entries);
    // Compact if the raw line count is much larger than what we keep.
    const lineCount = text.split('\n').filter((l) => l.trim()).length;
    if (lineCount > TASK_LOG_CAP * 4) {
      writeFileSync(TASK_LOG_PATH, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
    }
  } catch { /* best-effort */ }
}

if (isMainModule) loadTaskHistory();

// Thrown when kie.ai returns a 2xx response whose body is not valid JSON.
// Observed empirically on /api/v1/jobs/recordInfo for tasks in interim
// (non-terminal) states — terminal-state responses parse cleanly. Poll loops
// catch this and retry the next iteration rather than aborting the whole task.
class KieMalformedResponseError extends Error {
  constructor(text, status) {
    super(`kie.ai API returned non-JSON (HTTP ${status}): ${text.slice(0, 500)}`);
    this.name = 'KieMalformedResponseError';
    this.status = status;
  }
}

// ── Error taxonomy (issue #25) ──────────────────────────────────────────────
// Agents key retry logic off a machine-readable prefix instead of string-
// matching upstream prose. Three buckets:
//   [retryable]    transient upstream conditions — safe to retry the SAME call
//   [fatal-client] the request itself is wrong (validation, credits, auth) —
//                  retrying unchanged will fail identically; fix the input
//   [fatal-task]   the generation failed server-side after submission —
//                  typically not billed; safe to retry with changed inputs
// Poll timeouts use [recoverable] (see #21): the task may still succeed —
// poll with check_task, do NOT resubmit.
// kie.ai status codes (per docs): 200 OK, 401 auth, 402 credits, 404 not
// found, 422 validation, 429 rate limit, 433 sub-key limit, 455 maintenance,
// 500 server error, 501 generation failed, 505 feature disabled.
const RETRYABLE_CODES = new Set([429, 455, 500, 502, 503, 504]);
const FATAL_CLIENT_CODES = new Set([400, 401, 402, 404, 405, 413, 422, 433, 505]);
function classifyKieCode(code, msg = '') {
  const m = String(msg).toLowerCase();
  // kie overloads 500 for both transient hiccups and permanent validation
  // failures — the message disambiguates the known validation shapes.
  if (code === 500 && (m.includes('required') || m.includes('not within the range') || m.includes('allowed options') || m.includes('invalid'))) {
    return 'fatal-client';
  }
  if (RETRYABLE_CODES.has(code) || m.includes('try again later') || m.includes('server is busy')) return 'retryable';
  if (FATAL_CLIENT_CODES.has(code)) return 'fatal-client';
  return 'retryable'; // unknown upstream conditions default to retry-safe reads
}
function kieError(code, msg, raw) {
  const bucket = classifyKieCode(code, msg);
  const err = new Error(`[${bucket}] kie.ai API error code ${code}: ${msg || JSON.stringify(raw)}`);
  err.kieCode = code;
  err.bucket = bucket;
  return err;
}

// Concurrency gate for task-creation calls (issue #30): kie rate-limits
// concurrent generations per account (429, plus a documented ~20-generation
// cap) and field reports measured failure rates climbing with parallelism.
// Queue excess creations here instead of surfacing upstream failures.
// Tune with KIE_MAX_CONCURRENT (default 4).
const MAX_CONCURRENT = Math.max(1, Number(process.env.KIE_MAX_CONCURRENT) || 4);
let creationsInFlight = 0;
const creationQueue = [];
async function withCreationSlot(fn) {
  if (creationsInFlight >= MAX_CONCURRENT) {
    console.error(`[kie-mcp] concurrency gate: ${creationsInFlight} creations in flight (cap ${MAX_CONCURRENT}) — queued`);
    await new Promise((resolve) => creationQueue.push(resolve));
  }
  creationsInFlight++;
  try {
    return await fn();
  } finally {
    creationsInFlight--;
    const next = creationQueue.shift();
    if (next) next();
  }
}

function isCreationCall(method, path) {
  return method === 'POST' && (path === '/api/v1/jobs/createTask' || path.startsWith('/api/v1/generate/') || path === '/api/v1/generate' || path.startsWith('/api/v1/lyrics') || path.startsWith('/api/v1/wav') || path.startsWith('/api/v1/midi') || path.startsWith('/api/v1/mp4') || path.startsWith('/api/v1/vocal-removal') || path.startsWith('/api/v1/suno'));
}

// Single HTTP attempt against the kie API. Throws bucket-classified errors.
async function kieAttempt(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  console.error(`[kie-mcp] ${method} ${path}${body ? ' body=' + JSON.stringify(body).slice(0, 200) : ''}`);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new KieMalformedResponseError(text, res.status);
  }
  console.error(`[kie-mcp] ${method} ${path} → HTTP ${res.status}, code=${json.code}, msg=${json.msg}, keys=${Object.keys(json).join(',')}`);
  const failCode = res.status !== 200 ? res.status : (json.code && json.code !== 200 ? json.code : null);
  if (failCode) throw kieError(failCode, json.msg, json);
  return json;
}

async function kieRequest(method, path, body) {
  if (!isCreationCall(method, path)) return kieAttempt(method, path, body);
  // Creations go through the concurrency gate and get bounded submission
  // retries WHILE HOLDING THE SLOT — creation failed means nothing was
  // billed, so retrying the submission is safe (issues #25/#30). 429/433
  // rate-limit responses retry too: that's the gate's whole reason to exist.
  return withCreationSlot(async () => {
    const delays = [2000, 5000];
    for (let attempt = 0; ; attempt++) {
      try {
        return await kieAttempt(method, path, body);
      } catch (err) {
        const rateLimited = err.kieCode === 429 || err.kieCode === 433;
        if ((err.bucket === 'retryable' || rateLimited) && attempt < delays.length) {
          console.error(`[kie-mcp] ${rateLimited ? 'rate-limited' : 'retryable failure'} on creation (${err.kieCode}) — retry ${attempt + 1}/${delays.length} in ${delays[attempt] / 1000}s`);
          await new Promise((r) => setTimeout(r, delays[attempt]));
          continue;
        }
        throw err;
      }
    }
  });
}

// All async Suno-family create endpoints go through here so the required
// callBackUrl is always present; an explicit body.callBackUrl wins.
function sunoCreate(path, body) {
  return kieRequest('POST', path, { callBackUrl: SUNO_CALLBACK_URL, ...body });
}

// Veo upscale endpoints return non-standard kie codes during polling that would
// cause kieRequest to throw mid-loop:
//   - 1080p (GET get-1080p-video): code 500 while processing, code 200 + resultUrl on success
//   - 4K    (POST get-4k-video):  code 422 on BOTH processing AND success (kie quirk),
//                                  with resultUrls populated on success
// Bypass kieRequest for these — fetch directly and parse without throwing.
async function fetchVeoUpscalePoll(method, path, body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null; // malformed JSON treated as "not ready" — retry next iteration
  }
}

// 1080p returns `resultUrl` (singular). 4K returns `resultUrls` (plural array). Be
// defensive against either, since kie's API is inconsistent here.
function extractUpscaleUrl(json) {
  if (!json?.data) return null;
  if (json.data.resultUrl) return json.data.resultUrl;
  if (Array.isArray(json.data.resultUrls) && json.data.resultUrls[0]) return json.data.resultUrls[0];
  return null;
}

// Polling endpoint config for dedicated models.
// Image models (GPT-4o, Flux Kontext) use successFlag-based polling.
// Video models (Veo, Runway) use their own status formats.
// Market models use the generic /api/v1/jobs/recordInfo endpoint.
const DEDICATED_POLL_ENDPOINTS = {
  // Image models
  'gpt4o': '/api/v1/gpt4o-image/record-info',
  'flux-kontext-pro': '/api/v1/flux/kontext/record-info',
  'flux-kontext-max': '/api/v1/flux/kontext/record-info',
  // Video models — poll endpoints looked up from VIDEO_MODEL_REGISTRY
};

// Resolve poll endpoint: check image dedicated endpoints first, then video model registry
function getPollEndpoint(modelId) {
  if (DEDICATED_POLL_ENDPOINTS[modelId]) return DEDICATED_POLL_ENDPOINTS[modelId];
  const videoDef = VIDEO_MODEL_REGISTRY[modelId];
  if (videoDef?.pollEndpoint) return videoDef.pollEndpoint;
  return null;
}

// Tolerant single-shot poll: returns null if kie.ai returned malformed JSON
// (a transient symptom observed on interim non-terminal states); rethrows
// anything else. The surrounding maxWaitMs still bounds total wait, so a
// persistently-broken endpoint will still time out cleanly.
async function pollOnce(method, path) {
  try {
    return await kieRequest(method, path);
  } catch (err) {
    if (err instanceof KieMalformedResponseError) {
      console.error(`[kie-mcp] transient malformed poll response (${path}); retrying next iteration.`);
      return null;
    }
    // Transient upstream flickers (429/455/5xx) mid-poll shouldn't abort a task
    // that is still running — the surrounding maxWaitMs still bounds total wait.
    if (err.bucket === 'retryable') {
      console.error(`[kie-mcp] transient poll failure (${err.message.slice(0, 120)}); retrying next iteration.`);
      return null;
    }
    throw err;
  }
}

// Tag an error with the task it belongs to so the top-level handler can append
// recovery guidance. stillRunning=true means the task was NOT observed to fail —
// it likely completes upstream (and is billed), so callers must poll, not re-submit.
function taskError(message, taskId, stillRunning = false) {
  const err = new Error(`[${stillRunning ? 'recoverable' : 'fatal-task'}] ${message}`);
  err.taskId = taskId;
  err.taskStillRunning = stillRunning;
  return err;
}

// Poll budgets by tool category, in seconds. One table instead of 25 hardcoded
// numbers (the old spread ran from an indefensible 60s for TTS to 900s for video).
// Override globally with KIE_POLL_BUDGET_<CATEGORY>=seconds, or per call with
// max_wait_seconds. See issue #22.
const POLL_BUDGET_DEFAULTS = { image: 600, video: 900, audio: 300, speech: 300 };
function pollBudgetMs(category, args) {
  const perCall = Number(args?.max_wait_seconds);
  if (perCall > 0) return Math.min(3600, Math.max(30, perCall)) * 1000;
  const env = Number(process.env[`KIE_POLL_BUDGET_${category.toUpperCase()}`]);
  if (env > 0) return env * 1000;
  return POLL_BUDGET_DEFAULTS[category] * 1000;
}

// Async-mode response: task submitted, caller polls on their own schedule.
function submitOnly(taskId, label, filename) {
  return { content: [{ type: 'text', text: [
    `🚀 Task submitted (wait=false) — not waiting for completion.`,
    `Model/tool: ${label}`,
    `Task ID: ${taskId}`,
    filename ? `Target filename: ${filename}` : '',
    ``,
    `Next steps:`,
    `  1. check_task task_id=${taskId}   (poll until State: success)`,
    `  2. download_result task_id=${taskId}${filename ? ` filename=${filename}` : ''}`,
    `The task is also tracked in list_tasks.`,
  ].filter(Boolean).join('\n') }] };
}

async function pollTask(taskId, maxWaitMs = 600000, modelId = null) {
  const dedicatedEndpoint = modelId && getPollEndpoint(modelId);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    if (dedicatedEndpoint) {
      // Dedicated models use their own polling endpoint
      const result = await pollOnce('GET', `${dedicatedEndpoint}?taskId=${taskId}`);
      if (result) {
        const data = result.data || result;

        // successFlag-based models: GPT-4o, Flux Kontext, Veo
        // successFlag: 0=processing, 1=success, 2+=failed
        if (data.successFlag !== undefined) {
          if (data.successFlag === 1) {
            const normalized = { ...data, state: 'success' };
            // GPT-4o: response.result_urls (snake_case)
            if (data.response?.result_urls) {
              normalized.resultJson = JSON.stringify({ resultUrls: data.response.result_urls });
            }
            // Veo: response.resultUrls (camelCase)
            if (data.response?.resultUrls) {
              normalized.resultJson = JSON.stringify({ resultUrls: data.response.resultUrls });
            }
            // Flux Kontext: resultImageUrl at top level
            if (data.resultImageUrl) {
              normalized.resultJson = JSON.stringify({ resultImageUrl: data.resultImageUrl });
            }
            return normalized;
          }
          if (data.successFlag >= 2) {
            throw taskError(`Task failed (flag=${data.successFlag}): ${data.errorMessage || data.failMsg || 'Unknown'}`, taskId);
          }
        }
        // state-based models: Runway (same format as market models)
        else if (data.state) {
          if (data.state === 'success') return data;
          if (data.state === 'fail') throw taskError(`Task failed: ${data.failMsg || 'Unknown'} (code: ${data.failCode})`, taskId);
        }
      }
    } else {
      // Market models use the generic recordInfo endpoint
      const result = await pollOnce('GET', `/api/v1/jobs/recordInfo?taskId=${taskId}`);
      if (result) {
        const data = result.data || result;
        if (data.state === 'success') return data;
        if (data.state === 'fail') throw taskError(`Task failed: ${data.failMsg || 'Unknown'} (code: ${data.failCode})`, taskId);
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw taskError(`Task ${taskId} timed out after ${maxWaitMs / 1000}s of polling`, taskId, true);
}

// Shared Suno polling — all Suno endpoints use the same poll pattern
// Suno operations whose result records live on their OWN record-info endpoint
// (NOT /generate/record-info, which returns data:null for them) with a
// `successFlag` + `response.<url fields>` shape. kie moved these at some point;
// polling /generate/record-info made these tools time out despite producing
// output. See issue #53.
const SUNO_RECORD_ENDPOINTS = {
  'suno/wav': '/api/v1/wav/record-info',
  'suno/mp4': '/api/v1/mp4/record-info',
  'suno/midi': '/api/v1/midi/record-info',
  'suno/vocal-removal': '/api/v1/vocal-removal/record-info',
  // Voice API tasks (#20) — record has voiceId/status, no downloadable file.
  'suno/voice-validate': '/api/v1/voice/record-info',
  'suno/voice-generate': '/api/v1/voice/record-info',
  'suno/voice-regenerate': '/api/v1/voice/record-info',
};

// Recursively collect every http(s) URL string reachable in a value. Used to
// pull result URLs out of the specialized Suno records without hardcoding each
// operation's field names (wav → response.audioWavUrl, vocal-removal →
// response.{vocalUrl,instrumentalUrl,...} + originData[].audio_url, etc.).
function collectUrls(node, acc = []) {
  if (node == null) return acc;
  if (typeof node === 'string') { if (/^https?:\/\//.test(node)) acc.push(node); return acc; }
  if (Array.isArray(node)) { for (const v of node) collectUrls(v, acc); return acc; }
  if (typeof node === 'object') { for (const v of Object.values(node)) collectUrls(v, acc); return acc; }
  return acc;
}

// Poll a specialized Suno record endpoint until successFlag === 'SUCCESS'.
async function pollSunoRecord(taskId, recordPath, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const poll = await pollOnce('GET', `${recordPath}?taskId=${taskId}`);
    if (poll) {
      const d = poll.data || poll;
      if (d.errorCode || d.errorMessage) throw taskError(`Suno task failed: ${d.errorMessage || d.errorCode}`, taskId);
      if (d.successFlag === 'SUCCESS') return d;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw taskError(`Suno task ${taskId} timed out after ${maxWaitMs / 1000}s of polling`, taskId, true);
}

// Download a flat list of URLs into outDir, naming take 0 = base.ext, take N =
// base-N.ext (reusing sunoTrackName so multi-stem results don't collide).
async function downloadUrlList(urls, outFilename, ext, outDir) {
  const files = [];
  for (let i = 0; i < urls.length; i++) {
    const p = join(outDir, sunoTrackName(outFilename, i, ext));
    if (existsSync(p)) console.error(`[kie-mcp] overwriting existing file: ${p}`);
    await downloadToFile(urls[i], p);
    files.push(p);
  }
  return files;
}

// Poll the Suno Voice API record endpoint until the task reaches one of
// `targetStates` (or a terminal failure). Status flow: wait_processing →
// processing_validate → wait_validating → success | fail | processing_validate_fail.
// Returns the record `data` (has voiceId on success). See issue #20.
async function pollVoiceUntil(taskId, targetStates, maxWaitMs = 300000) {
  const start = Date.now();
  const fails = new Set(['fail', 'processing_validate_fail']);
  while (Date.now() - start < maxWaitMs) {
    const poll = await pollOnce('GET', `/api/v1/voice/record-info?taskId=${taskId}`);
    if (poll) {
      const d = poll.data || poll;
      if (targetStates.includes(d.status)) return d;
      if (fails.has(d.status)) throw taskError(`Voice task failed (${d.status}): ${d.errorMessage || d.errorCode || 'unknown'}`, taskId);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw taskError(`Voice task ${taskId} timed out after ${maxWaitMs / 1000}s of polling`, taskId, true);
}

async function pollSunoTask(taskId, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const poll = await pollOnce('GET', `/api/v1/generate/record-info?taskId=${taskId}`);
    if (poll) {
      const d = poll.data || poll;
      if (d.status === 'SUCCESS' || d.status === 'FIRST_SUCCESS') {
        // Some operations (e.g. sounds) nest results under data.response — lift
        // sunoData to the top so all callers can read pollResult.sunoData
        if (!d.sunoData && d.response?.sunoData) d.sunoData = d.response.sunoData;
        return d;
      }
      if (d.status === 'CREATE_TASK_FAILED' || d.status === 'GENERATE_AUDIO_FAILED')
        throw taskError(`Suno task failed: ${d.errorMessage || d.status}`, taskId);
      if (d.status === 'SENSITIVE_WORD_ERROR') throw taskError('Content filtered by Suno.', taskId);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw taskError(`Suno task ${taskId} timed out after ${maxWaitMs / 1000}s of polling`, taskId, true);
}

// Resolve a task record regardless of which API family created it.
// Tries the endpoint implied by taskHistory first, then falls back through
// market (/jobs/recordInfo) and Suno (/generate/record-info). Needed so
// check_task / download_result work as the recovery path for ALL tools
// (Suno tasks are invisible to /jobs/recordInfo). See issue #21.
async function fetchTaskRecord(taskId) {
  const entry = taskHistory.find((t) => t.taskId === taskId);
  const attempts = [];
  // Specialized Suno records (wav/mp4/midi/vocal-removal) live on their own
  // endpoint — try it first when the task's op is known (issue #53).
  const special = entry?.model && SUNO_RECORD_ENDPOINTS[entry.model];
  if (special) attempts.push({ source: 'suno-record', path: `${special}?taskId=${taskId}` });
  const dedicated = entry?.model && getPollEndpoint(entry.model);
  if (dedicated) attempts.push({ source: 'dedicated', path: `${dedicated}?taskId=${taskId}` });
  if (entry?.model?.startsWith('suno')) {
    attempts.push({ source: 'suno', path: `/api/v1/generate/record-info?taskId=${taskId}` });
    attempts.push({ source: 'market', path: `/api/v1/jobs/recordInfo?taskId=${taskId}` });
  } else {
    attempts.push({ source: 'market', path: `/api/v1/jobs/recordInfo?taskId=${taskId}` });
    attempts.push({ source: 'suno', path: `/api/v1/generate/record-info?taskId=${taskId}` });
  }
  let lastErr = null;
  for (const a of attempts) {
    try {
      const result = await kieRequest('GET', a.path);
      const data = result.data || result;
      // A hit must look like a real record (state/status/successFlag present)
      if (data && (data.state !== undefined || data.status !== undefined || data.successFlag !== undefined)) {
        return { source: a.source, data, entry };
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Task ${taskId} not found on any endpoint (market, suno${dedicated ? ', dedicated' : ''}).${lastErr ? ` Last error: ${lastErr.message}` : ''}`);
}

// Helper to download Suno tracks from sunoData array
// Filename for the index-th Suno take. Splits base/extension from the caller's
// filename no matter what shape it arrived in — the old extension-replace regex
// was a no-op when the filename didn't end in `.${ext}` (no extension, or a
// different one), collapsing every take onto the SAME path so take 2 silently
// overwrote take 1 on multi-take results (Suno music returns 2). See issue #23.
function sunoTrackName(outFilename, index, ext = 'mp3') {
  const m = outFilename.match(/^(.+)\.([A-Za-z0-9]{1,5})$/);
  const base = m ? m[1] : outFilename;
  const outExt = m ? m[2] : ext;
  return index === 0 ? `${base}.${outExt}` : `${base}-${index + 1}.${outExt}`;
}

async function downloadSunoTracks(sunoData, outFilename, ext = 'mp3', outDir = RAW_DIR) {
  const downloadedFiles = [];
  for (let i = 0; i < sunoData.length; i++) {
    const track = sunoData[i];
    const url = track.audioUrl || track.videoUrl || track.midiUrl || track.wavUrl;
    if (!url) continue;
    const trackPath = join(outDir, sunoTrackName(outFilename, i, ext));
    if (existsSync(trackPath)) console.error(`[kie-mcp] overwriting existing file: ${trackPath}`);
    await downloadToFile(url, trackPath);
    downloadedFiles.push({ file: trackPath, title: track.title, duration: track.duration });
  }
  return downloadedFiles;
}

function extractResultUrls(result) {
  let urls = [];
  if (result.resultJson) {
    try {
      const p = typeof result.resultJson === 'string' ? JSON.parse(result.resultJson) : result.resultJson;
      urls = p.resultUrls || p.result_urls || [];
      if (p.resultObject?.url) urls.push(p.resultObject.url);
      // OmniHuman subject-detection returns resultObject.mask_urls
      if (Array.isArray(p.resultObject?.mask_urls)) urls.push(...p.resultObject.mask_urls);
      if (p.url) urls.push(p.url);
      // Flux kontext returns originImageUrl/resultImageUrl
      if (p.resultImageUrl) urls.push(p.resultImageUrl);
      if (p.info?.resultImageUrl) urls.push(p.info.resultImageUrl);
    } catch {
      if (typeof result.resultJson === 'string' && result.resultJson.startsWith('http')) {
        urls = [result.resultJson];
      }
    }
  }
  if (result.resultUrls) urls = [...urls, ...result.resultUrls];
  // Runway video: videoInfo.videoUrl
  if (result.videoInfo?.videoUrl) urls.push(result.videoInfo.videoUrl);
  // Specialized Suno records (wav/mp4/midi/vocal-removal) nest result URLs under
  // `response` with per-op field names — collect them all (issue #53).
  if (result.response && typeof result.response === 'object' && !result.response.sunoData) {
    urls.push(...collectUrls(result.response));
  }
  if (urls.length === 0 && result.url) urls = [result.url];
  // Deduplicate
  return [...new Set(urls)];
}

// Normalize any task-record shape into one state word: market `state`, Suno
// `status`, Veo numeric `successFlag`, or specialized-record string
// `successFlag` (wav/mp4/midi/vocal-removal — issue #53).
function normalizeTaskState(data) {
  if (data.state) return data.state;
  if (data.status) {
    const st = String(data.status).toLowerCase();  // Suno music is UPPER, Voice API is lower
    if (st === 'success' || st === 'first_success') return 'success';
    if (st.includes('fail') || st === 'sensitive_word_error') return 'fail';
    return 'generating';
  }
  if (data.successFlag === 'SUCCESS' || data.successFlag === 1) return 'success';
  if (data.successFlag === 'PENDING' || data.successFlag === 'PROCESSING') return 'generating';
  if (data.errorCode || (typeof data.successFlag === 'number' && data.successFlag >= 2)) return 'fail';
  return 'generating';
}

async function downloadToFile(url, destPath) {
  let downloadUrl = url;
  try {
    const dlResult = await kieRequest('POST', '/api/v1/common/download-url', { url });
    if (dlResult.data) downloadUrl = dlResult.data;
  } catch { /* direct download fallback */ }

  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  writeFileSync(destPath, Buffer.from(await response.arrayBuffer()));
  return destPath;
}

// ─── MCP Server ───

const SERVER_INFO = { name: 'kie-art', version: '4.8.0' };
const SERVER_CAPS = { capabilities: { tools: {} } };

// Handler functions — extracted so they can be registered on multiple server instances (HTTP sessions)
const handleListTools = async () => ({
  tools: [
    {
      name: 'generate_image',
      description: `Generate an image using kie.ai (47+ models). Downloads to kie/assets/raw/. MODEL GUIDE: Architecture/blueprints→gpt4o or nano-banana-2 (reasoning). Game art/3D→seedream/4.5 or 5-lite. Character sheets→ideogram/character. Text/logos→ideogram/v3 (best text). Photo editing→flux-kontext-pro. Generate-then-refine by named region→grok-imagine-image-2-0/text-to-image (4cr, #2 Arena T2I+edit, NEW) then grok_segment_map (free) + grok_image_edit (4cr). Anime→qwen (3cr cheapest). Fast drafts→nano-banana-2-lite (4cr, ~4s, NEW). Upscale→recraft/crisp-upscale (2cr). BG removal→recraft/remove-background. Cheapest→z-image,qwen (3cr). Best quality→nano-banana-pro (24cr), flux-kontext-max (100cr). Use list_models filter="use-case" to explore.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          prompt: { type: 'string', description: 'Text prompt describing the image to generate' },
          model: {
            type: 'string',
            description: 'Model ID. Use list_models to see all available models and their options.',
            default: 'gpt4o',
          },
          aspect_ratio: {
            type: 'string',
            description: 'Aspect ratio (valid values depend on model — see list_models). Common: 1:1, 2:3, 3:2, 16:9, 9:16, 4:3, 3:4',
            default: '2:3',
          },
          image_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Reference/input image URLs for image-to-image models',
          },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
          filename: {
            type: 'string',
            description: 'Output filename (saved to kie/assets/raw/). Auto-generated if omitted.',
          },
          model_options: {
            type: 'object',
            description: 'Model-specific options (quality, resolution, seed, negative_prompt, etc). Use list_models to see available options per model.',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'list_models',
      description: 'List all available kie.ai models with their aspect ratios and model-specific options',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter models by name (e.g. "flux", "gpt", "seedream")' },
          verbose: { type: 'boolean', default: false, description: 'Show full option details for each model' },
        },
      },
    },
    {
      name: 'check_task',
      description: 'Check the status of a kie.ai generation task by taskId',
      inputSchema: {
        type: 'object',
        properties: { task_id: { type: 'string' } },
        required: ['task_id'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List recent image generation tasks from this session',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', default: 10 } },
      },
    },
    {
      name: 'check_credits',
      description: 'Check remaining kie.ai account credits',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'download_result',
      description: 'Download a completed task result to kie/assets/raw/',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id'],
      },
    },
    {
      name: 'list_raw_assets',
      description: 'List all files in kie/assets/raw/ waiting to be processed',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'generate_video',
      description: `Generate a video using kie.ai (86+ models). Downloads to kie/assets/raw/. MODEL GUIDE: Best cinematic→veo-3/text-to-video (50cr/s, audio). Fast+cheap→grok-imagine-video-1-5-preview (1.6-3cr/s, audio, NEW), wan/flash-image-to-video (6-8cr/s measured; alias of wan/2-6-flash). Budget cinematic→hailuo-standard (4cr/s). Budget multimodal refs→bytedance/seedance-2-mini (9.5cr/s @480p). 30s single takes→bytedance/seedance-2-5 (NEW). Budget all-rounder w/ audio+templates+extend→pixverse-v6 family (4-9.6cr/s, NEW; I2V is its strength; transition=first/last-frame morph). Multilingual lip-synced dialogue→happyhorse-1-1 T2V/I2V/R2V (NEW). Fast Kling→kling/v3-turbo (18cr/s, audio, NEW). Image-to-video→veo-3/image-to-video, kling/image-to-video. Avatar/talking head→omnihuman-1-5 (premium, NEW), kling/ai-avatar-pro, infinitalk/from-audio. Re-dub existing footage→volcengine/video-to-video-lip-sync (8cr/s, NEW). Motion control→kling/motion-control, wan/animate-move. Extend video→use veo_extend or runway_extend tools. NOTE: Sora 2 family is paused upstream by kie.ai (June 2026) — not usable. Use list_models filter="use-case" to explore.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          prompt: { type: 'string', description: 'Video description prompt' },
          model: {
            type: 'string',
            description: 'Model ID (e.g. "veo-3/text-to-video", "sora/text-to-video", "kling/image-to-video")',
            default: 'veo-3/text-to-video',
          },
          aspect_ratio: {
            type: 'string',
            description: 'Aspect ratio: 16:9, 9:16, or 1:1',
            default: '16:9',
          },
          image_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Input image URLs for image-to-video models',
          },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
          filename: {
            type: 'string',
            description: 'Output filename (saved to kie/assets/raw/). Auto-generated if omitted.',
          },
          model_options: {
            type: 'object',
            description: 'Model-specific options (duration, resolution, mode, etc.)',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'generate_music',
      description: `Generate music using Suno via kie.ai. Supports V5.5 (custom style), V5 (best quality), V4.5+, V4.5, V4. Up to 8 minutes. Great for game music stems, ambient tracks, and jingles. Polls until done and downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          prompt: {
            type: 'string',
            description: 'Music description (e.g. "upbeat Celtic fantasy adventure, flute and drums, heroic")',
          },
          model: {
            type: 'string',
            enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'],
            default: 'V5',
            description: 'Suno model. V5_5=custom style, V5=best quality. Default: V5',
          },
          instrumental: {
            type: 'boolean',
            default: true,
            description: 'No vocals when true (recommended for game music)',
          },
          style: {
            type: 'string',
            description: 'Style tags (e.g. "Celtic, orchestral, upbeat, fantasy, game music")',
          },
          title: { type: 'string', description: 'Track title (optional)' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'generate_sfx',
      description: `Generate a sound effect from text via Suno V5 (kie.ai removed the ElevenLabs sound-effect model). Great for game sounds: UI clicks, magic spells, item pickups, explosions. For loop/BPM/key control use generate_sounds instead. Downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          text: {
            type: 'string',
            description: 'Sound description (e.g. "magical sparkle chime, fairy-like, short 0.5s")',
          },
          duration_seconds: {
            type: 'number',
            description: 'Target duration hint, folded into the prompt (Suno has no hard duration control).',
          },
          prompt_influence: {
            type: 'number',
            description: 'Deprecated — ignored (no Suno equivalent). Kept for backward compatibility.',
          },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['text'],
      },
    },
    {
      name: 'generate_gemini_tts',
      description: `NEW — Google Gemini native TTS via kie.ai: style-directed speech from natural-language direction, 30 named voices, up to 2 speakers, inline tone tags like [whispers]/[laughs] (flash model). ~4.2 credits per MINUTE of audio — cheaper than all ElevenLabs tiers. Simple mode: pass text (+ optional voice_name). Dialogue mode: pass speakers + dialogue_turns. model=flash is most expressive (keep expected audio <60s — quality degrades on long takes); model=pro is more stable for multi-minute narration. Downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600 },
          model: { type: 'string', enum: ['flash', 'pro'], default: 'flash', description: 'flash = Gemini 3.1 Flash TTS (most expressive, 200+ inline tags, best <60s); pro = Gemini 2.5 Pro TTS (more stable long-form). Same price.' },
          text: { type: 'string', description: 'Simple mode: the text to speak (single speaker). Inline tone tags like [whispers] work on flash. Ignored if dialogue_turns is set.' },
          voice_name: { type: 'string', enum: ['Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe', 'Callirrhoe', 'Charon', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux', 'Iapetus', 'Kore', 'Laomedeia', 'Leda', 'Orus', 'Puck', 'Pulcherrima', 'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel', 'Vindemiatrix', 'Zephyr', 'Zubenelgenubi'], description: 'Simple mode voice (default Zephyr)' },
          speakers: { type: 'array', description: 'Dialogue mode: 1-2 speakers as [{speaker_id: "Speaker 1", voice_name, audio_profile?, accent?, style?, pace?}]. accent: Neutral|American (Gen)|American (Valley)|American (South)|British (RP)|British (Brixton)|Transatlantic|Australian. style: Vocal Smile|Newscaster|Whisper|Empathetic|Promo/Hype|Deadpan. pace: Natural|Rapid Fire|The Drift|Staccato.' },
          dialogue_turns: { type: 'array', description: 'Dialogue mode: [{speaker_id, text}] in order; text ≤10000 chars, may contain tone tags' },
          scene: { type: 'string', description: 'Scene description, e.g. "A quiet, warm room with a fireplace crackling softly."' },
          sample_context: { type: 'string', description: 'Overall tone/direction, e.g. "Audiobook style narration. Tone is gentle and inviting."' },
          temperature: { type: 'number', minimum: 0, maximum: 2, description: 'Sampling temperature (default 1)' },
          filename: { type: 'string', description: 'Output filename (default gemini-tts-<ts>.wav)' },
          download_dir: { type: 'string', description: 'Absolute directory to save into (created if missing). Defaults to the server\'s kie/assets/raw/.' },
        },
      },
    },
    {
      name: 'generate_tts',
      description: `Generate speech from text using ElevenLabs via kie.ai. Supports Turbo 2.5 (fast) and Multilingual V2 (high quality). Downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          text: { type: 'string', description: 'Text to synthesize into speech' },
          voice_id: {
            type: 'string',
            description: 'Voice name (e.g. "Bella", "Viking Bjorn", "Aria") or kie voice ID. kie.ai only accepts its curated ~67-voice set — arbitrary ElevenLabs voice IDs are rejected. An unknown value returns the full catalog. Optional — defaults to James.',
          },
          model: {
            type: 'string',
            enum: ['turbo-2-5', 'multilingual-v2'],
            default: 'turbo-2-5',
            description: 'turbo-2-5=fast, multilingual-v2=high quality with language support',
          },
          speed: {
            type: 'number',
            description: 'Speech speed (0.7–1.2). Only for multilingual-v2.',
          },
          language_code: {
            type: 'string',
            description: 'Language code for multilingual-v2 (e.g. "en", "es", "fr", "ja")',
          },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['text'],
      },
    },
    {
      name: 'generate_dialogue',
      description: `Generate multi-speaker dialogue using ElevenLabs Text-to-Dialogue V3 via kie.ai. Great for conversations between characters. Downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          dialogue: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'Line of dialogue' },
                voice: { type: 'string', description: 'Voice name (e.g. "Bella") or kie voice ID for this speaker — kie.ai only accepts its curated voice set; unknown values return the full catalog' },
              },
              required: ['text', 'voice'],
            },
            description: 'Array of dialogue lines with voice assignments',
          },
          stability: {
            type: 'number',
            enum: [0, 0.5, 1],
            description: 'Voice stability — kie accepts exactly 0 (creative), 0.5 (natural), or 1 (robust)',
          },
          language_code: { type: 'string', description: 'Language code (e.g. "en")' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['dialogue'],
      },
    },
    {
      name: 'audio_isolation',
      description: `Isolate vocals or audio from background noise using ElevenLabs via kie.ai. Input an audio URL, get clean isolated audio back.`,
      inputSchema: {
        type: 'object',
        properties: {
          audio_url: { type: 'string', description: 'Audio URL to process (max 10MB)' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['audio_url'],
      },
    },
    // ── New Suno Tools ──
    {
      name: 'extend_music',
      description: 'Extend/continue an existing Suno track from a specific point. Requires audioId from a previous generate_music task.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          audioId: { type: 'string', description: 'Audio ID from a previous Suno generation (from sunoData)' },
          prompt: { type: 'string', description: 'Prompt for the extension' },
          style: { type: 'string', description: 'Style tags for the extension' },
          title: { type: 'string' },
          continueAt: { type: 'number', description: 'Timestamp in seconds to continue from' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          defaultParamFlag: { type: 'boolean', default: false, description: 'Use default params from original track' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['audioId', 'prompt'],
      },
    },
    {
      name: 'cover_audio',
      description: 'Create an AI cover from uploaded audio — custom vocals, style, and instrumentation via Suno.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          uploadUrl: { type: 'string', description: 'URL of audio to cover' },
          prompt: { type: 'string', description: 'Description of desired cover style' },
          customMode: { type: 'boolean', default: false },
          instrumental: { type: 'boolean', default: false },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          style: { type: 'string' },
          title: { type: 'string' },
          negativeTags: { type: 'string', description: 'Tags to avoid in the cover' },
          vocalGender: { type: 'string', description: 'Vocal gender preference' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['uploadUrl'],
      },
    },
    {
      name: 'add_instrumental',
      description: 'Add instrumental backing to uploaded vocal audio via Suno.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          uploadUrl: { type: 'string', description: 'URL of vocal audio' },
          title: { type: 'string' },
          tags: { type: 'string', description: 'Style tags for the instrumental' },
          negativeTags: { type: 'string' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['uploadUrl'],
      },
    },
    {
      name: 'add_vocals',
      description: 'Add AI vocals to uploaded instrumental audio via Suno.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          prompt: { type: 'string', description: 'Lyrics or vocal description' },
          uploadUrl: { type: 'string', description: 'URL of instrumental audio' },
          title: { type: 'string' },
          style: { type: 'string' },
          negativeTags: { type: 'string' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['prompt', 'uploadUrl'],
      },
    },
    {
      name: 'replace_section',
      description: 'Replace a time range in a Suno track with new AI-generated content.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Task ID of the original Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          prompt: { type: 'string', description: 'Prompt for the replacement section' },
          infillStartS: { type: 'number', description: 'Start time in seconds' },
          infillEndS: { type: 'number', description: 'End time in seconds' },
          tags: { type: 'string' },
          title: { type: 'string' },
          negativeTags: { type: 'string' },
          fullLyrics: { type: 'string', description: 'Full lyrics for context' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId', 'audioId', 'prompt', 'infillStartS', 'infillEndS'],
      },
    },
    {
      name: 'generate_lyrics',
      description: 'Generate song lyrics from a prompt using Suno AI (max 200 characters). Returns text, no file download.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt for lyrics generation (max 200 chars)' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'convert_to_wav',
      description: 'Convert a Suno track to lossless WAV format. Downloads to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId', 'audioId'],
      },
    },
    {
      name: 'separate_vocals',
      description: 'Separate vocals from instrumentals, or split into individual stems. Downloads to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          type: { type: 'string', enum: ['separate_vocal', 'split_stem'], default: 'separate_vocal', description: 'separate_vocal=vocals+instrumental, split_stem=individual instruments' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId', 'audioId'],
      },
    },
    {
      name: 'generate_midi',
      description: 'Export a Suno track to MIDI notation. Downloads .mid file to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData (optional)' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'create_music_video',
      description: 'Generate an MP4 music video visualization from a Suno track. Downloads to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          author: { type: 'string', description: 'Author name for video credits' },
          domainName: { type: 'string', description: 'Domain name for video branding' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId', 'audioId'],
      },
    },
    {
      name: 'generate_sounds',
      description: 'Generate loopable sound effects with BPM, key, and loop control via Suno. Downloads to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (defaults: image 600, video 900, audio 300, speech 300). Ignored when wait=false.' },
          prompt: { type: 'string', description: 'Sound description (e.g. "ambient rain on a tin roof, soft thunder")' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          soundLoop: { type: 'boolean', default: false, description: 'Whether the sound should loop seamlessly' },
          soundTempo: { type: 'number', description: 'BPM for the sound' },
          soundKey: { type: 'string', description: 'Musical key (e.g. "C", "Am")' },
          grabLyrics: { type: 'boolean', default: false },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'generate_persona',
      description: 'NEW — Create a Suno Persona (reusable music character) from an existing Suno track. Requires taskId from V3.6+ generation.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID from a previous Suno generation (V3.6+)' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          name: { type: 'string', description: 'Persona name' },
          description: { type: 'string', description: 'Detailed Persona description (musical style, personality)' },
          vocalStart: { type: 'number', default: 0, description: 'Start time in seconds for vocal analysis' },
          vocalEnd: { type: 'number', default: 30, description: 'End time in seconds (10-30s segment)' },
          style: { type: 'string', description: 'Music style tag (e.g. "Electronic Pop")' },
        },
        required: ['taskId', 'audioId', 'name', 'description'],
      },
    },
    {
      name: 'generate_mashup',
      description: 'NEW — Mashup up to 2 Suno tracks into one new track. Provide audioIds from previous generations.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          taskId: { type: 'string', description: 'Source task ID' },
          audioIds: { type: 'array', items: { type: 'string' }, description: 'Up to 2 audio IDs to mashup' },
          prompt: { type: 'string', description: 'Optional prompt for mashup direction' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['audioIds'],
      },
    },
    {
      name: 'boost_style',
      description: 'NEW — Convert concise style input (e.g. "Pop, Mysterious") into enhanced style description for music generation.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Concise style description to enhance' },
        },
        required: ['content'],
      },
    },
    {
      name: 'prepare_voice_clone',
      description: 'EXPERIMENTAL (#20) — STEP 1 of Suno custom-voice cloning (FREE). Submit a clean vocal sample; polls to `wait_validating`, after which kie sends a verification phrase to your KIE_CALLBACK_URL for the voice owner to read aloud (then use create_voice_clone). ⚠️ Only clone a voice you OWN or have explicit permission to use. The completion step is not verified end-to-end and needs a real callback URL.',
      inputSchema: {
        type: 'object',
        properties: {
          voice_url: { type: 'string', description: 'Public URL of a clean vocal sample (the voice to clone). Must be reachable by kie servers.' },
          vocal_start_s: { type: 'number', default: 0, description: 'Start of the vocal segment, seconds' },
          vocal_end_s: { type: 'number', default: 10, description: 'End of the vocal segment, seconds' },
          language: { type: 'string', default: 'en', description: 'Language of the vocal (e.g. "en")' },
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return the task_id immediately.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600 },
        },
        required: ['voice_url'],
      },
    },
    {
      name: 'create_voice_clone',
      description: 'EXPERIMENTAL (#20) — STEP 2 — after the voice owner records the verification phrase from prepare_voice_clone, submit that recording to finish the voice. On success returns a voiceId usable in generate_music. Unverified end-to-end.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'task_id from prepare_voice_clone (must be at wait_validating)' },
          verify_url: { type: 'string', description: 'Public URL of the voice owner\'s recording of the verification phrase' },
          voice_name: { type: 'string', description: 'Name for the custom voice' },
          description: { type: 'string', description: 'Optional description' },
          style: { type: 'string', description: 'Optional style hint, e.g. "Pop, Female Vocal"' },
          singer_skill_level: { type: 'string', enum: ['beginner', 'intermediate', 'professional'], description: 'Optional' },
          wait: { type: 'boolean', default: true },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600 },
        },
        required: ['task_id', 'verify_url', 'voice_name'],
      },
    },
    {
      name: 'regenerate_voice_clone',
      description: 'EXPERIMENTAL (#20) — retry a failed/incomplete custom-voice task by its task_id.',
      inputSchema: {
        type: 'object',
        properties: { task_id: { type: 'string', description: 'Voice task_id to retry' } },
        required: ['task_id'],
      },
    },
    {
      name: 'get_timestamped_lyrics',
      description: 'NEW — Get word-level timestamped lyrics from a Suno track. Useful for karaoke, captioning, or sync.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Suno task ID' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
        },
        required: ['taskId', 'audioId'],
      },
    },
    {
      name: 'generate_cover_art',
      description: 'NEW — Generate album cover art image for an existing Suno music track. One call per taskId only.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Suno task ID from a previous music generation' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'create_omni_voice',
      description: 'NEW — Create a reusable voice character for Gemini Omni video generation. Returns kieAudioId for use in generate_video audio_ids.',
      inputSchema: {
        type: 'object',
        properties: {
          audio_id: {
            type: 'string',
            enum: [
              'achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe',
              'callirrhoe', 'charon', 'despina', 'enceladus', 'erinome', 'fenrir',
              'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck',
              'pulcherrima', 'rasalgethi', 'sadachbia', 'sadaltager', 'schedar',
              'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi',
            ],
            description: 'Preset base voice (30 options). The created voice inherits this preset and is customized by voice_description.',
          },
          name: { type: 'string', maxLength: 210, description: 'Voice character name (max 210 chars)' },
          voice_description: { type: 'string', maxLength: 20000, description: 'Detailed voice characteristics: timbre, style, rate, emotion (max 20000 chars)' },
          example_dialogue: { type: 'string', maxLength: 120, description: 'Sample dialogue (max 120 chars), e.g. "Hello, I am Adam"' },
        },
        required: ['audio_id', 'name'],
      },
    },
    {
      name: 'create_omni_character',
      description: 'NEW — Create a reusable visual character for Gemini Omni video generation. Combines image + optional voice. Returns characterId.',
      inputSchema: {
        type: 'object',
        properties: {
          descriptions: { type: 'string', description: 'Character appearance, identity, style, clothing, personality' },
          image_urls: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1, description: 'Exactly 1 image URL (≤20MB)' },
          audio_ids: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Optional voice IDs from create_omni_voice' },
          character_name: { type: 'string', description: 'Character name' },
        },
        required: ['descriptions', 'image_urls'],
      },
    },
    {
      name: 'upload_extend_audio',
      description: 'NEW — Extend uploaded audio (NOT a Suno track) with new AI-generated content. For Suno tracks, use extend_music instead.',
      inputSchema: {
        type: 'object',
        properties: {
          wait: { type: 'boolean', default: true, description: 'Set false to submit and return immediately with the task_id (async mode) — then poll with check_task and fetch with download_result. Recommended for long generations to avoid client-side watchdog timeouts.' },
          max_wait_seconds: { type: 'number', minimum: 30, maximum: 3600, description: 'Override the blocking-mode polling budget in seconds (default: audio 300). Ignored when wait=false.' },
          uploadUrl: { type: 'string', description: 'URL of the audio file to extend' },
          prompt: { type: 'string', description: 'Description of the extension content' },
          continueAt: { type: 'number', description: 'Timestamp in seconds where to start the extension' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          style: { type: 'string', description: 'Style tags for the extension' },
          title: { type: 'string' },
          instrumental: { type: 'boolean', default: false },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['uploadUrl'],
      },
    },
    {
      name: 'speech_to_text',
      description: 'Transcribe audio to text using ElevenLabs Scribe v1. Supports diarization and audio event tagging. Returns transcription text.',
      inputSchema: {
        type: 'object',
        properties: {
          audio_url: { type: 'string', description: 'Audio URL to transcribe' },
          language_code: { type: 'string', description: 'Language code (e.g. "en", "es"). Auto-detected if omitted.' },
          tag_audio_events: { type: 'boolean', default: false, description: 'Tag non-speech audio events (laughter, music, etc.)' },
          diarize: { type: 'boolean', default: false, description: 'Identify different speakers' },
        },
        required: ['audio_url'],
      },
    },
    // ── File Upload ──
    {
      name: 'upload_file',
      description: 'Upload a file to kie.ai and get a public URL back. Use this to upload local images/audio/video before passing them to generation tools (image-to-image, image-to-video, reference/ingredient inputs). PREFER file_path for local files. Files expire after 3 days (kie temp storage).',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute path to a local file on the machine running this MCP server (the normal case for stdio setups). The server reads and streams the bytes itself — reliable at any size, unlike base64_data. PREFERRED for local files.' },
          file_url: { type: 'string', description: 'URL of file to upload — must be PUBLICLY reachable by kie.ai servers (no localhost/private IPs, no auth-gated or expired links). For local files use file_path' },
          base64_data: { type: 'string', description: 'Base64-encoded file data — raw base64 or a full data: URI. Whitespace and base64url are normalized and the data:<mime>;base64, prefix is stripped automatically (its MIME infers the extension if file_name is omitted). WARNING: payloads above ~10-12K chars (observed ceiling ~11.7K, #68) are silently truncated in transit as a tool argument — use file_path for local files; base64_data is a fallback for remote/HTTP-mode callers with small payloads.' },
          upload_path: { type: 'string', description: 'Storage directory (e.g. "images", "audio", "video")', default: 'uploads' },
          file_name: { type: 'string', description: 'Custom filename (optional)' },
        },
      },
    },
    // ── Veo Extend & Upscale ──
    {
      name: 'grok_segment_map',
      description: 'FREE (0 credits). Segment a Grok Imagine Image 2.0 generation into NAMED regions for targeted editing. Returns each region\'s index, semantic name (e.g. "red apple", "wooden table"), and mask PNG URL. Workflow: generate_image model="grok-imagine-image-2-0/text-to-image" → grok_segment_map (this, free) → grok_image_edit with the mask_indexs you want changed. Only works on task_ids from a Grok Image 2.0 generation.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID from a completed generate_image call with model grok-imagine-image-2-0/text-to-image' },
        },
        required: ['task_id'],
      },
    },
    {
      name: 'grok_image_edit',
      description: 'Edit ONLY selected regions of a Grok Imagine Image 2.0 generation (4 credits). Pass the source task_id, an edit prompt describing the desired end state of the masked region(s), and mask_indexs — the region indices from grok_segment_map (run it first, free, and pick regions by NAME; do not guess indices). Everything outside the masks is preserved. Returns a new full image; the result task_id can itself be segmented/edited again for iterative refinement at 4 cr per round. Downloads to kie/assets/raw/.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Source task ID — a Grok Image 2.0 generation (or a previous grok_image_edit result)' },
          prompt: { type: 'string', description: 'What the masked region(s) should become, plus what to preserve (e.g. "change the background to a sunset beach, keep the apple unchanged")' },
          mask_indexs: { type: 'array', items: { type: 'number' }, description: 'Region indices to edit, from grok_segment_map (e.g. [1] or [0, 2]). Field name matches kie\'s API spelling.' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id', 'prompt', 'mask_indexs'],
      },
    },
    {
      name: 'veo_extend',
      description: 'Extend an existing Veo 3.1 video with additional content. Requires taskId from a previous Veo generation.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID from original Veo generation' },
          prompt: { type: 'string', description: 'Description of what happens in the extension' },
          model: { type: 'string', enum: ['fast', 'quality', 'lite'], default: 'fast' },
          seeds: { type: 'number', description: 'Random seed (10000-99999) for variation control' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id', 'prompt'],
      },
    },
    {
      name: 'veo_upscale_1080p',
      description: 'Upscale a Veo 3.1 video to 1080p resolution. Requires taskId from a completed Veo generation.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID from completed Veo generation' },
          index: { type: 'number', default: 0, description: 'Video index if multiple outputs' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id'],
      },
    },
    {
      name: 'veo_upscale_4k',
      description: 'Upscale a Veo 3.1 video to 4K resolution. Takes 5-10 minutes. Requires taskId from completed Veo generation.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID from completed Veo generation' },
          index: { type: 'number', default: 0, description: 'Video index if multiple outputs' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id'],
      },
    },
    // ── Runway Extend ──
    {
      name: 'runway_extend',
      description: 'Extend an existing Runway Aleph video with continuation content.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID from original Runway generation' },
          prompt: { type: 'string', description: 'Description of what happens in the extension' },
          quality: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
          filename: { type: 'string' },
          download_dir: { type: 'string', description: 'Absolute directory to save the file(s) into (created if missing). Defaults to the server\'s kie/assets/raw/. Must be absolute — the MCP server\'s working directory is not the caller\'s.' },
        },
        required: ['task_id', 'prompt'],
      },
    },
  ],
});

const handleCallTool = async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_image': {
        const { prompt, model: modelId = 'gpt4o', aspect_ratio = '2:3', image_urls, filename, model_options = {} } = args;

        const modelDef = MODEL_REGISTRY[modelId];
        if (!modelDef) {
          const available = Object.keys(MODEL_REGISTRY).join(', ');
          return { content: [{ type: 'text', text: `Unknown model "${modelId}". Available models:\n${available}` }] };
        }

        if (modelDef.requiresImage && (!image_urls || image_urls.length === 0)) {
          return { content: [{ type: 'text', text: `Model "${modelId}" requires image_urls (image-to-image model).` }] };
        }
        const validationError = validateModelOptions(modelDef, { aspect_ratio, prompt }, model_options, modelId);
        if (validationError) {
          return { content: [{ type: 'text', text: `Invalid input for "${modelId}": ${validationError}` }] };
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeModelName = modelId.replace(/\//g, '-');
        const outFilename = sanitizeFilename(filename) || `${safeModelName}-${ts}.png`;
        const outPath = join(resolveOutputDir(args), outFilename);

        let taskId;

        if (modelDef.type === 'dedicated') {
          // GPT-4o and Flux Kontext have dedicated endpoints
          const body = modelDef.buildBody(prompt, aspect_ratio, image_urls, model_options);
          body.callBackUrl = undefined; // We poll instead
          const result = await kieRequest('POST', modelDef.endpoint, body);
          taskId = result.data?.taskId || result.taskId;
          if (!taskId) {
            return { content: [{ type: 'text', text: `Failed to create task — no taskId in response.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };
          }
        } else {
          // Market models use createTask — use apiModel if provided, else the registry key
          const input = modelDef.buildInput(prompt, aspect_ratio, image_urls, model_options);
          const body = { model: modelDef.apiModel || modelId, input };
          const result = await kieRequest('POST', '/api/v1/jobs/createTask', body);
          taskId = result.data?.taskId || result.taskId;
          if (!taskId) {
            return { content: [{ type: 'text', text: `Failed to create task — no taskId in response.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };
          }
        }

        const taskEntry = {
          taskId,
          model: modelId,
          prompt: prompt?.slice(0, 100) + ((prompt?.length || 0) > 100 ? '...' : ''),
          filename: outFilename,
          status: 'polling',
          createdAt: new Date().toISOString(),
        };
        trackTask(taskEntry);
        if (args.wait === false) return submitOnly(taskId, modelId, outFilename);

        // Poll until done — pass modelId so dedicated endpoints use their own polling URL
        const result = await pollTask(taskId, pollBudgetMs('image', args), modelId);
        const resultUrls = extractResultUrls(result);

        if (resultUrls.length === 0) {
          taskEntry.status = 'no_urls'; appendTaskLog(taskEntry);
          return {
            content: [{
              type: 'text',
              text: `Task ${taskId} completed but no result URLs found.\nRaw: ${JSON.stringify(result, null, 2)}`,
            }],
          };
        }

        // Download all results
        const downloadedFiles = [];
        for (let i = 0; i < resultUrls.length; i++) {
          const path = i === 0 ? outPath : join(resolveOutputDir(args), outFilename.replace(/\.png$/, `-${i + 1}.png`));
          await downloadToFile(resultUrls[i], path);
          downloadedFiles.push(path);
        }

        taskEntry.status = 'downloaded'; appendTaskLog(taskEntry);
        taskEntry.resultUrls = resultUrls;

        return {
          content: [{
            type: 'text',
            text: [
              `✅ Image generated successfully!`,
              `Model: ${modelDef.name} (${modelId})`,
              `Task ID: ${taskId}`,
              `Cost time: ${result.costTime ? result.costTime / 1000 + 's' : 'N/A'}`,
              `Cost: ${formatCost(modelId, result)}`,
              ``,
              `Downloaded ${downloadedFiles.length} file(s):`,
              ...downloadedFiles.map((f) => `  → ${f}`),
              ``,
              // Result URLs are needed for i2i chaining (pass as the next call's
              // image_urls) and are NOT pattern-stable — never reconstruct them (#66).
              `Result URL(s) — use these for image-to-image chaining (temporary, ~24h; not pattern-stable, never guess them):`,
              ...resultUrls.map((u) => `  → ${u}`),
              ``,
              `Use the Read tool to preview the image, then \`/art-asset process\` to crop and integrate.`,
            ].join('\n'),
          }],
        };
      }

      case 'list_models': {
        const { filter, verbose } = args;

        // Split multi-word queries — every word must match somewhere in id/name/caps/description/research
        const matchesFilter = (id, m, f) => {
          const words = f.split(/\s+/).filter(Boolean);
          const parts = [
            id, m.name, m.description || '', m.category || '',
            ...(m.capabilities || []),
          ];
          // Include research fields if present
          if (m.research) {
            parts.push(m.research.verdict || '');
            parts.push(...(m.research.bestFor || []));
            parts.push(...(m.research.weaknesses || []));
            parts.push(...(m.research.communityInsights || []));
            parts.push(m.research.costEfficiency || '');
          }
          const searchText = parts.join(' ').toLowerCase();
          return words.every(w => searchText.includes(w));
        };

        const formatEntries = (entries, isVideo = false) => entries.map(([id, m]) => {
          let line = `**${m.name}** — \`${id}\``;
          if (m.paused) line += ' ⏸ [PAUSED upstream — do not use]';
          if (isVideo) line += ' [video]';
          if (m.requiresImage) line += ' [requires image]';
          const costPerUnit = PRICING[id] || PRICING[m.apiModel];
          if (costPerUnit) {
            line += isVideo ? ` | ~${costPerUnit} cr/s` : ` | ~${costPerUnit} cr`;
          }
          if (m.capabilities?.length) line += `  [${m.capabilities.join(', ')}]`;
          if (m.description) line += `\n  ${m.description}`;
          if (m.aspectRatios?.length) line += `\n  Aspect ratios: ${m.aspectRatios.join(', ')}`;
          // Show research verdict (always if available, full details if verbose)
          if (m.research?.verdict) {
            line += `\n  Research: ${m.research.verdict}`;
            if (m.research.bestFor?.length) line += `\n  Best for: ${m.research.bestFor.join(', ')}`;
            if (verbose) {
              if (m.research.weaknesses?.length) line += `\n  Weaknesses: ${m.research.weaknesses.join('; ')}`;
              if (m.research.promptTechniques?.length) line += `\n  Prompt tips:\n${m.research.promptTechniques.map(t => `    - ${t}`).join('\n')}`;
              if (m.research.communityInsights?.length) line += `\n  Community insights:\n${m.research.communityInsights.map(t => `    - ${t}`).join('\n')}`;
              if (m.research.costEfficiency) line += `\n  Cost efficiency: ${m.research.costEfficiency}`;
              if (m.research.comparedTo) {
                const comps = Object.entries(m.research.comparedTo).map(([k, v]) => `    vs ${k}: ${v}`);
                line += `\n  Comparisons:\n${comps.join('\n')}`;
              }
            }
          }
          if (verbose && m.options) {
            const optLines = Object.entries(m.options).map(([k, v]) => {
              let desc = `    ${k}`;
              if (v.type) desc += ` (${v.type})`;
              if (v.enum) desc += ` — values: ${v.enum.join(', ')}`;
              if (v.default !== undefined) desc += ` — default: ${v.default}`;
              if (v.min !== undefined) desc += ` — range: ${v.min}-${v.max}`;
              if (v.description) desc += ` — ${v.description}`;
              return desc;
            });
            line += '\n  Options:\n' + optLines.join('\n');
          } else if (m.options) {
            line += `\n  Options: ${Object.keys(m.options).join(', ')}`;
          }
          return line;
        });

        const formatAudioEntries = (entries) => entries.map(([id, m]) => {
          let line = `**${m.name}** — \`${id}\``;
          const cost = PRICING[m.pricingKey];
          if (cost) line += ` | ~${cost} cr`;
          if (m.capabilities?.length) line += `  [${m.capabilities.join(', ')}]`;
          if (m.description) line += `\n  ${m.description}`;
          if (m.research?.verdict) {
            line += `\n  Research: ${m.research.verdict}`;
            if (m.research.bestFor?.length) line += `\n  Best for: ${m.research.bestFor.join(', ')}`;
          }
          return line;
        });

        let imageEntries = Object.entries(MODEL_REGISTRY);
        let videoEntries = Object.entries(VIDEO_MODEL_REGISTRY);
        let audioEntries = Object.entries(AUDIO_TOOLS_REGISTRY);

        if (filter) {
          const f = filter.toLowerCase();
          imageEntries = imageEntries.filter(([id, m]) => matchesFilter(id, m, f));
          videoEntries = videoEntries.filter(([id, m]) => matchesFilter(id, m, f));
          audioEntries = audioEntries.filter(([id, m]) => matchesFilter(id, m, f));
        }

        if (imageEntries.length === 0 && videoEntries.length === 0 && audioEntries.length === 0) {
          return { content: [{ type: 'text', text: `No models matching "${filter}". Try: gpt, flux, seedream, imagen, nano, grok, ideogram, qwen, veo, sora, kling, wan, hailuo, seedance, runway, suno, elevenlabs, music, speech, sfx, photorealistic, reasoning, cinematic, lip-sync, upscale` }] };
        }

        const sections = [];
        if (imageEntries.length > 0) sections.push(`## Image Models (${imageEntries.length})\n\n` + formatEntries(imageEntries).join('\n\n'));
        if (videoEntries.length > 0) sections.push(`## Video Models (${videoEntries.length})\n\n` + formatEntries(videoEntries, true).join('\n\n'));
        if (audioEntries.length > 0) sections.push(`## Audio Tools (${audioEntries.length})\n\n` + formatAudioEntries(audioEntries).join('\n\n'));

        return { content: [{ type: 'text', text: sections.join('\n\n---\n\n') }] };
      }

      case 'check_task': {
        const { source, data } = await fetchTaskRecord(args.task_id);
        const state = normalizeTaskState(data);
        return {
          content: [{
            type: 'text',
            text: [
              `Task: ${data.taskId || args.task_id}`,
              `State: ${state}${data.status ? ` (${data.status})` : ''}`,
              `Source: ${source}`,
              `Progress: ${data.progress || 0}%`,
              `Model: ${data.model || 'N/A'}`,
              `Cost time: ${data.costTime ? data.costTime / 1000 + 's' : 'N/A'}`,
              typeof data.creditsConsumed === 'number' ? `Cost: ${data.creditsConsumed} credits (~$${(data.creditsConsumed * 0.005).toFixed(3)}) [actual]` : '',
              data.failMsg || data.errorMessage ? `Error: ${data.failMsg || data.errorMessage}` : '',
              data.voiceId ? `Voice ID: ${data.voiceId} (use in generate_music)` : '',
              data.status === 'wait_validating' ? `Next: the voice owner records the verification phrase (sent to your KIE_CALLBACK_URL), then call create_voice_clone with verify_url.` : '',
              data.resultJson ? `Result: ${JSON.stringify(data.resultJson)}` : '',
              state === 'success' && !data.voiceId ? `Retrieve with: download_result task_id=${args.task_id}` : '',
            ].filter(Boolean).join('\n'),
          }],
        };
      }

      case 'list_tasks': {
        const limit = args.limit || 10;
        const recent = taskHistory.slice(-limit);
        if (recent.length === 0) return { content: [{ type: 'text', text: 'No tasks this session.' }] };
        const lines = recent.map((t, i) =>
          `${i + 1}. [${t.status}] ${t.model} — ${t.prompt}\n   ID: ${t.taskId}\n   File: ${t.filename}`
        );
        return { content: [{ type: 'text', text: lines.join('\n\n') }] };
      }

      case 'check_credits': {
        const result = await kieRequest('GET', '/api/v1/chat/credit');
        return { content: [{ type: 'text', text: `Account credits: ${JSON.stringify(result.data ?? result)}` }] };
      }

      case 'download_result': {
        const { source, data, entry } = await fetchTaskRecord(args.task_id);
        // Suno-family results: sunoData tracks (possibly nested under response)
        if (source === 'suno') {
          if (data.status !== 'SUCCESS' && data.status !== 'FIRST_SUCCESS') {
            return { content: [{ type: 'text', text: `Task is "${data.status}", not yet downloadable.` }] };
          }
          const sunoData = data.sunoData || data.response?.sunoData;
          if (!sunoData?.length) return { content: [{ type: 'text', text: `Suno task ${args.task_id} succeeded but has no tracks.` }] };
          const outName = sanitizeFilename(args.filename) || entry?.filename || `download-${args.task_id.slice(0, 8)}.mp3`;
          const files = await downloadSunoTracks(sunoData, outName, 'mp3', resolveOutputDir(args));
          return { content: [{ type: 'text', text: `Downloaded ${files.length} track(s):\n${files.map((f) => `  → ${f.file}`).join('\n')}` }] };
        }
        const state = normalizeTaskState(data);
        if (state !== 'success') {
          return { content: [{ type: 'text', text: `Task is "${state}", not yet downloadable.` }] };
        }
        const urls = extractResultUrls(data);
        if (urls.length === 0) {
          return { content: [{ type: 'text', text: `No result URLs for task ${args.task_id}` }] };
        }
        // Specialized Suno records (wav/mp4/midi/vocal-removal) can yield multiple
        // files (e.g. vocal stems) — download them all with non-colliding names (#53).
        if (source === 'suno-record') {
          const outName = sanitizeFilename(args.filename) || entry?.filename || `download-${args.task_id.slice(0, 8)}.mp3`;
          const ext = outName.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || 'mp3';
          const files = await downloadUrlList(urls, outName, ext, resolveOutputDir(args));
          if (entry) { entry.status = 'success'; appendTaskLog(entry); }
          return { content: [{ type: 'text', text: `Downloaded ${files.length} file(s):\n${files.map((f) => `  → ${f}`).join('\n')}` }] };
        }
        // Prefer the filename recorded when the task was created (right extension)
        const outName = sanitizeFilename(args.filename) || entry?.filename || `download-${args.task_id.slice(0, 8)}.png`;
        const outPath = join(resolveOutputDir(args), outName);
        await downloadToFile(urls[0], outPath);
        if (entry) { entry.status = 'success'; appendTaskLog(entry); }
        return { content: [{ type: 'text', text: `Downloaded to: ${outPath}\nResult URL: ${urls[0]} (temporary; not pattern-stable — reuse verbatim for chaining)` }] };
      }

      case 'list_raw_assets': {
        try {
          const files = readdirSync(RAW_DIR).filter((f) => !f.startsWith('.'));
          if (files.length === 0) return { content: [{ type: 'text', text: 'No files in kie/assets/raw/' }] };
          const details = files.map((f) => {
            const s = statSync(join(RAW_DIR, f));
            return `  ${f} (${(s.size / 1024).toFixed(0)}KB, ${s.mtime.toISOString().slice(0, 19)})`;
          });
          return { content: [{ type: 'text', text: `Files in kie/assets/raw/:\n${details.join('\n')}` }] };
        } catch {
          return { content: [{ type: 'text', text: 'Raw directory is empty or missing.' }] };
        }
      }

      case 'generate_video': {
        const { prompt, model: modelId = 'veo-3/text-to-video', aspect_ratio = '16:9', image_urls, filename, model_options = {} } = args;

        const modelDef = VIDEO_MODEL_REGISTRY[modelId];
        if (!modelDef) {
          const available = Object.keys(VIDEO_MODEL_REGISTRY).join(', ');
          return { content: [{ type: 'text', text: `Unknown video model "${modelId}". Available:\n${available}` }] };
        }
        if (modelDef.paused) {
          return { content: [{ type: 'text', text: `⏸ ${modelDef.name} (${modelId}) is currently unavailable: ${modelDef.paused}. Pick an alternative with list_models — e.g. veo-3 (cinematic + audio), kling-3/video (multi-shot 4K), seedance-2 (creative control), wan/flash (cheapest).` }], isError: true };
        }
        if (modelDef.requiresImage && (!image_urls || image_urls.length === 0)) {
          return { content: [{ type: 'text', text: `Model "${modelId}" requires image_urls.` }] };
        }
        // Coerce duration to the type this model's option spec declares (issue
        // #28) — kie is silently type-strict per model (5 fails where "5" works
        // and vice versa), and callers can't be expected to track which is which.
        if (model_options.duration !== undefined && model_options.duration !== null) {
          const durRes = coerceDuration(modelDef.options?.duration, model_options.duration);
          if (durRes.error) return { content: [{ type: 'text', text: `Invalid input for "${modelId}": ${durRes.error}` }] };
          model_options.duration = durRes.value;
        }
        const validationError = validateModelOptions(modelDef, { aspect_ratio, prompt }, model_options, modelId);
        if (validationError) {
          return { content: [{ type: 'text', text: `Invalid input for "${modelId}": ${validationError}` }] };
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeModelName = modelId.replace(/\//g, '-');
        const outFilename = sanitizeFilename(filename) || `${safeModelName}-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);

        let taskId;

        if (modelDef.type === 'dedicated') {
          // Dedicated endpoint models (Veo, Runway) have their own generate URL
          const body = modelDef.buildBody(prompt, aspect_ratio, image_urls, model_options);
          const result = await kieRequest('POST', modelDef.endpoint, body);
          taskId = result.data?.taskId || result.taskId;
        } else {
          // Market models use the generic createTask endpoint with the API model name
          const input = modelDef.buildInput(prompt, aspect_ratio, image_urls, model_options);
          const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: modelDef.apiModel, input });
          taskId = result.data?.taskId || result.taskId;
        }

        if (!taskId) return { content: [{ type: 'text', text: `Failed to create video task — no taskId returned.\nCheck model "${modelId}" is valid.` }] };

        trackTask({ taskId, model: modelId, prompt: prompt?.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, modelId, outFilename);

        // Use dedicated poll endpoint if available, otherwise generic market polling
        const pollEndpoint = modelDef.pollEndpoint || null;
        const pollResult = await pollTask(taskId, pollBudgetMs('video', args), pollEndpoint ? modelId : null);
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Task ${taskId} done but no result URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return {
          content: [{
            type: 'text',
            text: [`✅ Video generated!`, `Model: ${modelDef.name}`, `Task ID: ${taskId}`, `Cost: ${formatCost(modelId, pollResult, parseInt(model_options.duration) || 8)}`, ``, `Downloaded to: ${outPath}`, `Result URL: ${resultUrls[0]} (temporary, ~24h; not pattern-stable — never reconstruct, reuse verbatim)`].join('\n'),
          }],
        };
      }

      case 'generate_music': {
        const { prompt, model = 'V5', instrumental = true, style, title, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `music-${ts}.mp3`;

        const body = { prompt, model, customMode: false, instrumental };
        if (style) body.style = style;
        if (title) body.title = title;

        const result = await sunoCreate('/api/v1/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start music generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: `suno-${model}`, prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, `suno-${model}`, outFilename);

        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData;
        if (!sunoData || sunoData.length === 0) return { content: [{ type: 'text', text: `Music task ${taskId} completed but no tracks returned.` }] };

        const downloadedFiles = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));

        return {
          content: [{
            type: 'text',
            text: [
              `✅ Music generated (Suno ${model})!`,
              `Task ID: ${taskId}`,
              `Tracks: ${downloadedFiles.length}`,
              ...downloadedFiles.map((f) => `  → ${f.file}${f.title ? ` — "${f.title}"` : ''}${f.duration ? ` (${f.duration}s)` : ''}`),
              ``,
              `Use download_result or copy directly from kie/assets/raw/`,
            ].join('\n'),
          }],
        };
      }

      case 'generate_sfx': {
        // kie.ai removed elevenlabs/sound-effect-v2 (createTask still accepts the
        // slug but every generation fails server-side with code 500, and the docs
        // page is gone) — route through Suno's sound generator instead.
        const { text, duration_seconds, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `sfx-${ts}.mp3`;

        // Suno has no duration parameter — fold the target length into the prompt
        const prompt = duration_seconds !== undefined
          ? `${text}, about ${Math.max(0.5, duration_seconds)} seconds long`
          : text;

        const result = await sunoCreate('/api/v1/generate/sounds', { prompt, model: 'V5' });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start SFX generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: 'suno/sounds', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/sounds', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `SFX task ${taskId} done but no results.` }] };

        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ SFX generated (via Suno V5)!\nText: "${text}"\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'generate_gemini_tts': {
        const { model: gModel = 'flash', text, voice_name, speakers, dialogue_turns, scene, sample_context, temperature, filename } = args;
        const apiModel = gModel === 'pro' ? 'google/gemini-2-5-pro-tts' : 'google/gemini-3-1-flash-tts';
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `gemini-tts-${ts}.wav`;
        const outPath = join(resolveOutputDir(args), outFilename);

        // Simple mode (text) builds a single-speaker request; dialogue mode passes through.
        let spk = speakers, turns = dialogue_turns;
        if (!turns?.length) {
          if (!text) return { content: [{ type: 'text', text: 'Provide either `text` (simple mode) or `speakers` + `dialogue_turns` (dialogue mode).' }], isError: true };
          spk = spk?.length ? spk : [{ speaker_id: 'Speaker 1', voice_name: voice_name || 'Zephyr' }];
          turns = [{ speaker_id: spk[0].speaker_id || 'Speaker 1', text }];
        }
        if (spk.length > 2) return { content: [{ type: 'text', text: 'Gemini TTS supports at most 2 speakers per request (upstream hard limit).' }], isError: true };
        const input = { speakers: spk, dialogue_turns: turns };
        if (scene) input.scene = scene;
        if (sample_context) input.sample_context = sample_context;
        if (temperature !== undefined) input.temperature = temperature;

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: apiModel, input });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start Gemini TTS — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: apiModel, prompt: (turns[0]?.text || '').slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, apiModel, outFilename);

        const pollResult = await pollTask(taskId, pollBudgetMs('speech', args));
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `Gemini TTS task ${taskId} done but no URLs found.\n${JSON.stringify(pollResult).slice(0, 500)}` }] };
        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: [`✅ Gemini TTS generated!`, `Model: ${apiModel}`, `Task ID: ${taskId}`, `Cost: ${formatCost(apiModel, pollResult)}`, ``, `Downloaded to: ${outPath}`].join('\n') }] };
      }

      case 'generate_tts': {
        const { text, voice_id, model: ttsModel = 'turbo-2-5', speed, language_code, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `tts-${ts}.mp3`;
        const outPath = join(resolveOutputDir(args), outFilename);

        const apiModel = ttsModel === 'multilingual-v2' ? 'elevenlabs/text-to-speech-multilingual-v2' : 'elevenlabs/text-to-speech-turbo-2-5';
        // kie.ai requires a voice (422 "voiceId cannot be empty" without one) despite docs claiming a server-side default
        const input = { text, voice: resolveVoice(voice_id), output_format: 'mp3_44100_128' };
        if (speed !== undefined && ttsModel === 'multilingual-v2') input.speed = speed;
        if (language_code && ttsModel === 'multilingual-v2') input.language_code = language_code;

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: apiModel, input });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start TTS generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: apiModel, prompt: text.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, apiModel, outFilename);
        const pollResult = await pollTask(taskId, pollBudgetMs('speech', args));
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `TTS task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ TTS generated!\nModel: ${apiModel}\nText: "${text.slice(0, 80)}"\nDownloaded to: ${outPath}` }] };
      }

      case 'generate_dialogue': {
        const { dialogue, stability, language_code, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `dialogue-${ts}.mp3`;
        const outPath = join(resolveOutputDir(args), outFilename);

        // Validate every segment's voice client-side (issue #26). Accept the
        // `voice_id` alias — agents copy the param name from generate_tts, and
        // the old code silently fell back to the default voice for those
        // segments, collapsing multi-speaker dialogue onto one voice.
        const resolvedDialogue = dialogue.map((line, i) => {
          const v = line.voice ?? line.voice_id;
          if (!v) {
            const catalog = ELEVENLABS_VOICES.map((x) => `${x.name}${x.vibe ? ` — ${x.vibe}` : ''} (${x.id})`).join('\n');
            throw new Error(`dialogue[${i}] has no voice. Every line needs a "voice" (name like "Bella" or kie voice ID) so speakers are distinguishable. Allowed voices:\n${catalog}`);
          }
          const { voice_id: _alias, ...rest } = line;
          return { ...rest, voice: resolveVoice(v) };  // resolveVoice throws with the catalog on unknown values
        });
        const input = { dialogue: resolvedDialogue };
        if (stability !== undefined) {
          // kie's dialogue endpoint accepts exactly 0 / 0.5 / 1 and otherwise
          // returns a bare "422: refer to the documentation" — catch it here.
          if (![0, 0.5, 1].includes(stability)) {
            return { content: [{ type: 'text', text: `Invalid stability ${stability} — kie.ai's text-to-dialogue-v3 accepts exactly 0 (creative), 0.5 (natural), or 1 (robust).` }], isError: true };
          }
          input.stability = stability;
        }
        if (language_code) input.language_code = language_code;

        let result;
        try {
          result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'elevenlabs/text-to-dialogue-v3', input });
        } catch (err) {
          // kie's dialogue 422s carry no detail ("refer to the documentation") —
          // append the endpoint's actual constraints so callers can self-correct.
          if (err.kieCode === 422) {
            err.message += `\nDialogue endpoint constraints: dialogue = array of { text, voice } (voice from the curated catalog — names or IDs, see generate_tts errors for the list); stability one of 0 / 0.5 / 1; language_code optional ISO code. Total text is billed at ~14 credits per 1000 characters.`;
          }
          throw err;
        }
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start dialogue generation.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: 'elevenlabs/text-to-dialogue-v3', prompt: dialogue[0]?.text?.slice(0, 80) || 'dialogue', filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'elevenlabs/text-to-dialogue-v3', outFilename);
        const pollResult = await pollTask(taskId, pollBudgetMs('speech', args));
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `Dialogue task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Dialogue generated!\nSpeakers: ${dialogue.length} lines\nDownloaded to: ${outPath}` }] };
      }

      case 'audio_isolation': {
        const { audio_url, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `isolated-${ts}.mp3`;
        const outPath = join(resolveOutputDir(args), outFilename);

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'elevenlabs/audio-isolation', input: { audio_url } });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start audio isolation.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: 'elevenlabs/audio-isolation', prompt: audio_url.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollTask(taskId, pollBudgetMs('speech', args));
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `Audio isolation task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Audio isolated!\nDownloaded to: ${outPath}` }] };
      }

      // ── New Suno Tools ──

      case 'extend_music': {
        const { audioId, prompt, style, title, continueAt, model, defaultParamFlag, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `extend-${ts}.mp3`;
        const body = { audioId, prompt };
        if (style) body.style = style;
        if (title) body.title = title;
        if (continueAt !== undefined) body.continueAt = continueAt;
        if (model) body.model = model;
        if (defaultParamFlag !== undefined) body.defaultParamFlag = defaultParamFlag;
        const result = await sunoCreate('/api/v1/generate/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/extend', prompt: prompt?.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/extend', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData;
        if (!sunoData?.length) return { content: [{ type: 'text', text: `Extend task ${taskId} completed but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Music extended!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'cover_audio': {
        const { uploadUrl, prompt, customMode, instrumental, model, style, title, negativeTags, vocalGender, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `cover-${ts}.mp3`;
        const body = { uploadUrl };
        if (prompt) body.prompt = prompt;
        if (customMode !== undefined) body.customMode = customMode;
        if (instrumental !== undefined) body.instrumental = instrumental;
        if (model) body.model = model;
        if (style) body.style = style;
        if (title) body.title = title;
        if (negativeTags) body.negativeTags = negativeTags;
        if (vocalGender) body.vocalGender = vocalGender;
        const result = await sunoCreate('/api/v1/generate/upload-cover', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/cover', prompt: (prompt || uploadUrl).slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/cover', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData;
        if (!sunoData?.length) return { content: [{ type: 'text', text: `Cover task ${taskId} completed but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Audio cover created!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'add_instrumental': {
        const { uploadUrl, title, tags, negativeTags, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `instrumental-${ts}.mp3`;
        const body = { uploadUrl };
        if (title) body.title = title;
        if (tags) body.tags = tags;
        if (negativeTags) body.negativeTags = negativeTags;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/add-instrumental', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/add-instrumental', prompt: uploadUrl.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/add-instrumental', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Instrumental added!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'add_vocals': {
        const { prompt, uploadUrl, title, style, negativeTags, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `vocals-${ts}.mp3`;
        const body = { prompt, uploadUrl };
        if (title) body.title = title;
        if (style) body.style = style;
        if (negativeTags) body.negativeTags = negativeTags;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/add-vocals', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/add-vocals', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/add-vocals', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Vocals added!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'replace_section': {
        const { taskId: origTaskId, audioId, prompt, infillStartS, infillEndS, tags, title, negativeTags, fullLyrics, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `replace-${ts}.mp3`;
        const body = { taskId: origTaskId, audioId, prompt, infillStartS, infillEndS };
        if (tags) body.tags = tags;
        if (title) body.title = title;
        if (negativeTags) body.negativeTags = negativeTags;
        if (fullLyrics) body.fullLyrics = fullLyrics;
        const result = await sunoCreate('/api/v1/generate/replace-section', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/replace-section', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/replace-section', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Section replaced!\nTask ID: ${taskId}\nRange: ${infillStartS}s-${infillEndS}s\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'generate_lyrics': {
        const { prompt } = args;
        const body = { prompt: prompt.slice(0, 200) };
        const result = await sunoCreate('/api/v1/lyrics', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/lyrics', prompt: prompt.slice(0, 80), status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const lyrics = pollResult.sunoData?.[0]?.text || pollResult.text || JSON.stringify(pollResult);
        return { content: [{ type: 'text', text: `✅ Lyrics generated!\nTask ID: ${taskId}\n\n${lyrics}` }] };
      }

      case 'convert_to_wav': {
        const { taskId: origTaskId, audioId, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `wav-${ts}.wav`;
        const outPath = join(resolveOutputDir(args), outFilename);
        const body = { taskId: origTaskId, audioId };
        const result = await sunoCreate('/api/v1/wav/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/wav', prompt: `wav of ${audioId || origTaskId}`, filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/wav', outFilename);
        const wavRec = await pollSunoRecord(taskId, SUNO_RECORD_ENDPOINTS['suno/wav'], pollBudgetMs('audio', args));
        const wavUrls = extractResultUrls(wavRec);
        if (!wavUrls.length) return { content: [{ type: 'text', text: `WAV task ${taskId} done but no URL found.\n${JSON.stringify(wavRec)}` }] };
        await downloadToFile(wavUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ WAV converted!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'separate_vocals': {
        const { taskId: origTaskId, audioId, type: sepType = 'separate_vocal', filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `stems-${ts}.mp3`;
        const body = { taskId: origTaskId, audioId, type: sepType };
        const result = await sunoCreate('/api/v1/vocal-removal/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/vocal-removal', prompt: sepType, filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/vocal-removal', outFilename);
        const vrRec = await pollSunoRecord(taskId, SUNO_RECORD_ENDPOINTS['suno/vocal-removal'], pollBudgetMs('audio', args));
        const vrUrls = extractResultUrls(vrRec);
        if (!vrUrls.length) return { content: [{ type: 'text', text: `Separation task ${taskId} done but no results.\n${JSON.stringify(vrRec)}` }] };
        const files = await downloadUrlList(vrUrls, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Vocals separated (${sepType})!\nTask ID: ${taskId}\n${files.map(f => `  → ${f}`).join('\n')}` }] };
      }

      case 'generate_midi': {
        const { taskId: origTaskId, audioId, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `midi-${ts}.mid`;
        const outPath = join(resolveOutputDir(args), outFilename);
        const body = { taskId: origTaskId };
        if (audioId) body.audioId = audioId;
        const result = await sunoCreate('/api/v1/midi/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/midi', prompt: `midi of ${audioId || origTaskId}`, filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/midi', outFilename);
        const midiRec = await pollSunoRecord(taskId, SUNO_RECORD_ENDPOINTS['suno/midi'], pollBudgetMs('audio', args));
        const midiUrls = extractResultUrls(midiRec);
        if (!midiUrls.length) return { content: [{ type: 'text', text: `MIDI task ${taskId} done but no URL found.\n${JSON.stringify(midiRec)}` }] };
        await downloadToFile(midiUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ MIDI exported!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'create_music_video': {
        const { taskId: origTaskId, audioId, author, domainName, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `musicvideo-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);
        const body = { taskId: origTaskId, audioId };
        if (author) body.author = author;
        if (domainName) body.domainName = domainName;
        const result = await sunoCreate('/api/v1/mp4/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/mp4', prompt: `music video of ${audioId}`, filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/mp4', outFilename);
        const mp4Rec = await pollSunoRecord(taskId, SUNO_RECORD_ENDPOINTS['suno/mp4'], pollBudgetMs('audio', args));
        const mp4Urls = extractResultUrls(mp4Rec);
        if (!mp4Urls.length) return { content: [{ type: 'text', text: `Music video task ${taskId} done but no URL found.\n${JSON.stringify(mp4Rec)}` }] };
        await downloadToFile(mp4Urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Music video created!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'generate_sounds': {
        const { prompt, model = 'V5', soundLoop, soundTempo, soundKey, grabLyrics, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `sound-${ts}.mp3`;
        const body = { prompt, model };
        if (soundLoop !== undefined) body.soundLoop = soundLoop;
        if (soundTempo !== undefined) body.soundTempo = soundTempo;
        if (soundKey) body.soundKey = soundKey;
        if (grabLyrics !== undefined) body.grabLyrics = grabLyrics;
        const result = await sunoCreate('/api/v1/generate/sounds', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/sounds', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/sounds', outFilename);
        const pollResult = await pollSunoTask(taskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Sounds task ${taskId} done but no results.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Sound generated!\nTask ID: ${taskId}${soundLoop ? ' (loopable)' : ''}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      // ── New Suno Tools (April-May 2026) ──

      case 'generate_persona': {
        const { taskId, audioId, name: personaName, description: personaDesc, vocalStart, vocalEnd, style } = args;
        const body = { taskId, audioId, name: personaName, description: personaDesc };
        if (vocalStart !== undefined) body.vocalStart = vocalStart;
        if (vocalEnd !== undefined) body.vocalEnd = vocalEnd;
        if (style) body.style = style;
        const result = await sunoCreate('/api/v1/generate/generate-persona', body);
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId: newTaskId, model: 'suno/persona', prompt: personaName, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(newTaskId, pollBudgetMs('audio', args));
        const personaId = pollResult.personaId || pollResult.data?.personaId;
        return { content: [{ type: 'text', text: `✅ Persona created!\nTask ID: ${newTaskId}\nPersona ID: ${personaId || 'see result'}\nName: ${personaName}\n\nUse this Persona ID in future generate_music calls for character consistency.` }] };
      }

      case 'generate_mashup': {
        const { taskId, audioIds, prompt, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `mashup-${ts}.mp3`;
        const body = { audioIds };
        if (taskId) body.taskId = taskId;
        if (prompt) body.prompt = prompt;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/mashup', body);
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId: newTaskId, model: 'suno/mashup', prompt: prompt?.slice(0, 80) || 'mashup', filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(newTaskId, 'suno/mashup', outFilename);
        const pollResult = await pollSunoTask(newTaskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Mashup task ${newTaskId} done but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Mashup created!\nTask ID: ${newTaskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      // ── Suno Voice API — custom voice cloning (EXPERIMENTAL, #20) ──
      case 'prepare_voice_clone': {
        const { voice_url, vocal_start_s = 0, vocal_end_s = 10, language = 'en' } = args;
        const body = { voiceUrl: voice_url, vocalStartS: vocal_start_s, vocalEndS: vocal_end_s, language };
        const result = await sunoCreate('/api/v1/voice/validate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'suno/voice-validate', prompt: `voice clone: ${voice_url.slice(0, 60)}`, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/voice-validate', null);
        const rec = await pollVoiceUntil(taskId, ['wait_validating', 'success'], pollBudgetMs('audio', args));
        return { content: [{ type: 'text', text: [
          `✅ Voice sample validated (task ${taskId}, status: ${rec.status}).`,
          rec.voiceId ? `Voice ID: ${rec.voiceId} — usable in generate_music.` : '',
          rec.status === 'wait_validating' ? `⏳ Next: kie sent a verification phrase to your KIE_CALLBACK_URL. The voice OWNER records themselves reading it, upload that recording, then call create_voice_clone task_id=${taskId} verify_url=<recording> voice_name=<name>.` : '',
          `⚠️ Only clone a voice you own or have explicit permission to use.`,
        ].filter(Boolean).join('\n') }] };
      }

      case 'create_voice_clone': {
        const { task_id, verify_url, voice_name, description, style, singer_skill_level } = args;
        const body = { taskId: task_id, verifyUrl: verify_url, voiceName: voice_name };
        if (description) body.description = description;
        if (style) body.style = style;
        if (singer_skill_level) body.singerSkillLevel = singer_skill_level;
        const result = await sunoCreate('/api/v1/voice/generate', body);
        const taskId = result.data?.taskId || result.taskId || task_id;
        trackTask({ taskId, model: 'suno/voice-generate', prompt: `voice: ${voice_name}`, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(taskId, 'suno/voice-generate', null);
        const rec = await pollVoiceUntil(taskId, ['success'], pollBudgetMs('audio', args));
        return { content: [{ type: 'text', text: [
          `✅ Custom voice created!`,
          `Voice ID: ${rec.voiceId || '(check_task for status)'} — use as the voice in generate_music.`,
          `Task ID: ${taskId}`,
        ].join('\n') }] };
      }

      case 'regenerate_voice_clone': {
        const { task_id } = args;
        const result = await sunoCreate('/api/v1/voice/regenerate', { taskId: task_id });
        const newTaskId = result.data?.taskId || result.taskId || task_id;
        trackTask({ taskId: newTaskId, model: 'suno/voice-regenerate', prompt: `regenerate voice ${task_id}`, status: 'polling', createdAt: new Date().toISOString() });
        return { content: [{ type: 'text', text: `✅ Voice regeneration started.\nTask ID: ${newTaskId}\nPoll with check_task; complete with create_voice_clone if it reaches wait_validating.` }] };
      }

      case 'boost_style': {
        const { content } = args;
        const result = await kieRequest('POST', '/api/v1/style/generate', { content });
        return { content: [{ type: 'text', text: `✅ Boosted style:\n${JSON.stringify(result.data || result, null, 2)}` }] };
      }

      case 'get_timestamped_lyrics': {
        const { taskId, audioId } = args;
        const result = await kieRequest('POST', '/api/v1/generate/get-timestamped-lyrics', { taskId, audioId });
        return { content: [{ type: 'text', text: `✅ Timestamped lyrics:\n${JSON.stringify(result.data || result, null, 2)}` }] };
      }

      case 'generate_cover_art': {
        const { taskId, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `cover-art-${ts}.png`;
        const outPath = join(resolveOutputDir(args), outFilename);
        const result = await sunoCreate('/api/v1/suno/cover/generate', { taskId });
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId: newTaskId, model: 'suno/cover-art', prompt: `cover art for ${taskId}`, filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(newTaskId, pollBudgetMs('audio', args));
        const urls = pollResult.images || pollResult.data?.images || (pollResult.imageUrl ? [pollResult.imageUrl] : []);
        if (!urls.length) return { content: [{ type: 'text', text: `Cover art task ${newTaskId} done but no images.\n${JSON.stringify(pollResult, null, 2)}` }] };
        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Cover art generated!\nTask ID: ${newTaskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'create_omni_voice': {
        const { audio_id, name: voiceName, voice_description, example_dialogue } = args;
        const body = { audio_id, name: voiceName };
        if (voice_description) body.voice_description = voice_description;
        if (example_dialogue) body.example_dialogue = example_dialogue;
        const result = await kieRequest('POST', '/api/v1/omni/audio/create', body);
        const data = result.data || result;
        const kieAudioId = data.kieAudioId || data.audio_id || data.id;
        if (!kieAudioId) return { content: [{ type: 'text', text: `Failed.\n${JSON.stringify(result, null, 2)}` }] };
        // Record in taskHistory so list_tasks can recover the ID later in the session.
        trackTask({ taskId: kieAudioId, model: 'gemini-omni/voice', prompt: voiceName, status: 'success', createdAt: new Date().toISOString() });
        return { content: [{ type: 'text', text: `✅ Voice character created!\nName: ${voiceName}\nkieAudioId: ${kieAudioId}\n\nUse this ID in generate_video model_options.audio_ids array (only consumed by model='gemini-omni/video').` }] };
      }

      case 'create_omni_character': {
        const { descriptions, image_urls, audio_ids, character_name } = args;
        if (!Array.isArray(image_urls) || image_urls.length !== 1) {
          return { content: [{ type: 'text', text: `image_urls must be an array with exactly 1 URL (got ${Array.isArray(image_urls) ? image_urls.length + ' items' : typeof image_urls}).` }] };
        }
        const body = { descriptions, image_urls };
        if (Array.isArray(audio_ids) && audio_ids.length) body.audio_ids = audio_ids.slice(0, 3);
        if (character_name) body.character_name = character_name;
        const result = await kieRequest('POST', '/api/v1/omni/character/create', body);
        const data = result.data || result;
        const characterId = data.characterId || data.character_id || data.id;
        if (!characterId) return { content: [{ type: 'text', text: `Failed.\n${JSON.stringify(result, null, 2)}` }] };
        // Record in taskHistory so list_tasks can recover the ID later in the session.
        trackTask({ taskId: characterId, model: 'gemini-omni/character', prompt: character_name || (descriptions ? descriptions.slice(0, 80) : '(unnamed)'), status: 'success', createdAt: new Date().toISOString() });
        return { content: [{ type: 'text', text: `✅ Visual character created!\nName: ${character_name || '(unnamed)'}\ncharacterId: ${characterId}\n\nUse this ID in generate_video model_options.character_ids array (only consumed by model='gemini-omni/video').` }] };
      }

      case 'upload_extend_audio': {
        const { uploadUrl, prompt, continueAt, model, style, title, instrumental, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `upload-extend-${ts}.mp3`;
        const body = { uploadUrl };
        if (prompt) body.prompt = prompt;
        if (continueAt !== undefined) body.continueAt = continueAt;
        if (model) body.model = model;
        if (style) body.style = style;
        if (title) body.title = title;
        if (instrumental !== undefined) body.instrumental = instrumental;
        const result = await sunoCreate('/api/v1/generate/upload-extend', body);
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId: newTaskId, model: 'suno/upload-extend', prompt: (prompt || uploadUrl).slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        if (args.wait === false) return submitOnly(newTaskId, 'suno/upload-extend', outFilename);
        const pollResult = await pollSunoTask(newTaskId, pollBudgetMs('audio', args));
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Extend task ${newTaskId} done but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename, 'mp3', resolveOutputDir(args));
        return { content: [{ type: 'text', text: `✅ Audio extended!\nTask ID: ${newTaskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'speech_to_text': {
        const { audio_url, language_code, tag_audio_events, diarize } = args;
        const input = { audio_url };
        if (language_code) input.language_code = language_code;
        if (tag_audio_events !== undefined) input.tag_audio_events = tag_audio_events;
        if (diarize !== undefined) input.diarize = diarize;
        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'elevenlabs/speech-to-text', input });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'elevenlabs/speech-to-text', prompt: audio_url.slice(0, 80), status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollTask(taskId, pollBudgetMs('speech', args));
        const transcription = pollResult.resultJson || pollResult;
        return { content: [{ type: 'text', text: `✅ Transcription complete!\nTask ID: ${taskId}\n\n${typeof transcription === 'string' ? transcription : JSON.stringify(transcription, null, 2)}` }] };
      }

      // ── File Upload ──

      case 'upload_file': {
        const { file_path, file_url, base64_data, upload_path = 'uploads', file_name } = args;
        const UPLOAD_BASE = 'https://kieai.redpandaai.co';

        if (file_path) {
          // Local file → kie's multipart stream endpoint. No base64 anywhere in
          // the chain, so the ~11.7K-char tool-argument truncation (#68) and the
          // atob failure class (#62) cannot occur. Only meaningful when the
          // server shares a filesystem with the caller (stdio — the normal case).
          if (!isAbsolute(file_path)) {
            return { content: [{ type: 'text', text: `file_path must be an absolute path (got: ${file_path}).` }], isError: true };
          }
          if (!existsSync(file_path) || !statSync(file_path).isFile()) {
            return { content: [{ type: 'text', text: `file_path does not exist or is not a file: ${file_path}\nNote: the path is read by the MCP server process — if the server runs on a different machine (HTTP mode), use base64_data or file_url instead.` }], isError: true };
          }
          const size = statSync(file_path).size;
          const MAX_UPLOAD = 100 * 1024 * 1024;
          if (size > MAX_UPLOAD) {
            return { content: [{ type: 'text', text: `File is ${(size / 1048576).toFixed(1)}MB — larger than the 100MB upload guard for kie temp storage.` }], isError: true };
          }
          const name = sanitizeFilename(file_name) || basename(file_path);
          const form = new FormData();
          form.append('file', new Blob([readFileSync(file_path)]), name);
          form.append('uploadPath', upload_path);
          form.append('fileName', name);
          const res = await fetch(`${UPLOAD_BASE}/api/file-stream-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${API_KEY}` },
            body: form,
          });
          const result = await res.json().catch(() => null);
          if (!result || (!result.success && result.code !== 200)) {
            return { content: [{ type: 'text', text: `Upload failed: ${result ? JSON.stringify(result) : `HTTP ${res.status}`}` }], isError: true };
          }
          return { content: [{ type: 'text', text: `✅ File uploaded!\nURL: ${result.data?.fileUrl || result.data?.downloadUrl}\nFile: ${result.data?.fileName || name} (${result.data?.fileSize ?? size} bytes)\nExpires: ${result.data?.expiresAt || '~3 days (kie temp storage)'}` }] };
        }

        if (file_url) {
          // kie's servers fetch the URL — anything not publicly reachable fails
          // with an opaque upstream error. Catch the obvious cases first (#29).
          let host = '';
          try { host = new URL(file_url).hostname; } catch { return { content: [{ type: 'text', text: `file_url is not a valid URL: ${file_url}` }], isError: true }; }
          const isPrivate = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)
            || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
            || host.endsWith('.local') || host.endsWith('.internal');
          if (isPrivate) {
            return { content: [{ type: 'text', text: `file_url points at a private/local address (${host}) that kie.ai's servers cannot reach — the URL must be PUBLICLY accessible. For local files, read the file and use base64_data instead.` }], isError: true };
          }
          const body = { fileUrl: file_url, uploadPath: upload_path };
          if (file_name) body.fileName = file_name;
          const res = await fetch(`${UPLOAD_BASE}/api/file-url-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await res.json();
          if (!result.success && result.code !== 200) {
            return { content: [{ type: 'text', text: `Upload failed: ${JSON.stringify(result)}\nNote: kie.ai's servers must be able to fetch this URL — it needs to be publicly reachable (no auth, not expired). For local or private files, use base64_data.` }], isError: true };
          }
          return { content: [{ type: 'text', text: `✅ File uploaded!\nURL: ${result.data?.fileUrl || result.data?.downloadUrl}\nFile: ${result.data?.fileName || ''} (${result.data?.fileSize ?? '?'} bytes)\nExpires: ${result.data?.expiresAt || '~3 days (kie temp storage)'}` }] };
        }

        if (base64_data) {
          // Normalize + validate before hitting kie (data-URI prefix strip,
          // whitespace removal, base64url→base64, length/char checks). A clear
          // client-side error beats kie's opaque doubled-atob failure (#29, #62).
          const norm = normalizeBase64(base64_data);
          if (norm.error) return { content: [{ type: 'text', text: `Invalid base64_data: ${norm.error}` }], isError: true };
          const raw = norm.data;
          const body = { base64Data: raw, uploadPath: upload_path };
          if (file_name) body.fileName = file_name;
          else if (norm.ext) body.fileName = `upload-${Date.now()}.${norm.ext}`;
          const res = await fetch(`${UPLOAD_BASE}/api/file-base64-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await res.json();
          if (!result.success && result.code !== 200) return { content: [{ type: 'text', text: `Upload failed: ${JSON.stringify(result)}` }], isError: true };
          return { content: [{ type: 'text', text: `✅ File uploaded!\nURL: ${result.data?.fileUrl || result.data?.downloadUrl}\nFile: ${result.data?.fileName || ''} (${result.data?.fileSize ?? '?'} bytes)\nExpires: ${result.data?.expiresAt || '~3 days (kie temp storage)'}` }] };
        }

        return { content: [{ type: 'text', text: 'Provide file_path (local file — preferred), file_url (public URL), or base64_data.' }] };
      }

      // ── Veo Extend & Upscale ──

      case 'grok_segment_map': {
        const { task_id } = args;
        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'grok-imagine-image-2-0/segment-map', input: { task_id } });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start segmentation — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        trackTask({ taskId, model: 'grok-imagine-image-2-0/segment-map', prompt: `segment ${task_id}`, filename: '', status: 'polling', createdAt: new Date().toISOString() });

        const pollResult = await pollTask(taskId, pollBudgetMs('image', args));
        let parsed = pollResult.resultJson;
        try { parsed = typeof parsed === 'string' ? JSON.parse(parsed) : parsed; } catch { /* leave raw */ }
        const segments = parsed?.resultObject?.segments || parsed?.segments || [];
        if (!segments.length) return { content: [{ type: 'text', text: `Segment task ${taskId} done but no segments returned.\nRaw: ${JSON.stringify(pollResult, null, 2)}` }] };

        return {
          content: [{
            type: 'text',
            text: [
              `✅ Segment map ready (FREE — 0 credits). ${segments.length} region(s) in task ${task_id}:`,
              ...segments.map((seg) => `  [${seg.index}] ${seg.name}${seg.maskUrl ? `  — mask: ${seg.maskUrl}` : ''}`),
              ``,
              `Next: grok_image_edit with task_id="${task_id}" and mask_indexs=[...] choosing regions by name above.`,
            ].join('\n'),
          }],
        };
      }

      case 'grok_image_edit': {
        const { task_id, prompt, mask_indexs, filename } = args;
        if (!Array.isArray(mask_indexs) || mask_indexs.length === 0) {
          return { content: [{ type: 'text', text: 'mask_indexs must be a non-empty array of region indices — run grok_segment_map first to get them.' }], isError: true };
        }
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `grok2-edit-${ts}.jpg`;
        const outPath = join(resolveOutputDir(args), outFilename);

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'grok-imagine-image-2-0/image-edit', input: { task_id, prompt, mask_indexs } });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start edit — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const taskEntry = { taskId, model: 'grok-imagine-image-2-0/image-edit', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() };
        trackTask(taskEntry);
        if (args.wait === false) return submitOnly(taskId, 'grok-imagine-image-2-0/image-edit', outFilename);

        const pollResult = await pollTask(taskId, pollBudgetMs('image', args));
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Edit task ${taskId} done but no URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        taskEntry.status = 'downloaded'; appendTaskLog(taskEntry);
        return {
          content: [{
            type: 'text',
            text: [
              `✅ Region edit done!`,
              `Task ID: ${taskId}  (chain again: grok_segment_map / grok_image_edit on this ID for another 4 cr round)`,
              `Edited regions: [${mask_indexs.join(', ')}] of source ${task_id}`,
              `Cost: ${formatCost('grok-imagine-image-2-0/image-edit', pollResult)}`,
              `Downloaded to: ${outPath}`,
              `Result URL (temporary ~24h; not pattern-stable): ${resultUrls[0]}`,
            ].join('\n'),
          }],
        };
      }

      case 'veo_extend': {
        const { task_id, prompt, model = 'fast', seeds, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `veo-extend-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);

        const body = { taskId: task_id, prompt, model };
        if (seeds !== undefined) body.seeds = seeds;

        const result = await kieRequest('POST', '/api/v1/veo/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: 'veo/extend', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        const pollResult = await pollTask(taskId, pollBudgetMs('video', args), 'veo-3/text-to-video');
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Extend task ${taskId} done but no URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Veo video extended!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'veo_upscale_1080p': {
        const { task_id, index = 0, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `veo-1080p-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);

        // 1080p uses GET; kie returns code 500 during processing (kieRequest would
        // throw), then code 200 + data.resultUrl on success. Use the tolerant fetch.
        const maxWait = 180000; // 3 min
        const start = Date.now();
        let resultUrl = null;
        while (Date.now() - start < maxWait) {
          const json = await fetchVeoUpscalePoll('GET', `/api/v1/veo/get-1080p-video?taskId=${task_id}&index=${index}`);
          resultUrl = extractUpscaleUrl(json);
          if (resultUrl) break;
          await new Promise((r) => setTimeout(r, 20000));
        }
        if (!resultUrl) return { content: [{ type: 'text', text: `1080p upscale timed out for task ${task_id}. Try again in a minute.` }] };

        await downloadToFile(resultUrl, outPath);
        return { content: [{ type: 'text', text: `✅ Veo 1080p upscale complete!\nDownloaded to: ${outPath}` }] };
      }

      case 'veo_upscale_4k': {
        const { task_id, index = 0, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `veo-4k-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);

        // 4K uses POST; first call kicks off the upscale (billed immediately), then
        // every subsequent POST polls. kie returns code 422 with msg "...processing..."
        // while running AND code 422 with msg "generated successfully" + data.resultUrls
        // populated on terminal state. kieRequest would throw on every poll (including
        // the success one) — use the tolerant fetch instead.
        const body = { taskId: task_id, index };
        let json = await fetchVeoUpscalePoll('POST', '/api/v1/veo/get-4k-video', body);
        let resultUrl = extractUpscaleUrl(json);

        const maxWait = 600000; // 10 min for 4K
        const start = Date.now();
        while (!resultUrl && Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, 30000));
          json = await fetchVeoUpscalePoll('POST', '/api/v1/veo/get-4k-video', body);
          resultUrl = extractUpscaleUrl(json);
        }
        if (!resultUrl) return { content: [{ type: 'text', text: `4K upscale timed out for task ${task_id}. May still be processing — try again.` }] };

        await downloadToFile(resultUrl, outPath);
        return { content: [{ type: 'text', text: `✅ Veo 4K upscale complete!\nDownloaded to: ${outPath}` }] };
      }

      // ── Runway Extend ──

      case 'runway_extend': {
        const { task_id, prompt, quality = '720p', filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = sanitizeFilename(filename) || `runway-extend-${ts}.mp4`;
        const outPath = join(resolveOutputDir(args), outFilename);

        const body = { taskId: task_id, prompt, quality };
        const result = await kieRequest('POST', '/api/v1/runway/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };

        trackTask({ taskId, model: 'runway/extend', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        // Runway uses its own poll endpoint
        const pollResult = await pollTask(taskId, pollBudgetMs('video', args), 'runway/text-to-video');
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Extend task ${taskId} done but no URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Runway video extended!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    let text = `Error: ${error.message}`;
    // Errors tagged with a taskId (poll timeouts / task failures) get recovery
    // guidance so callers never re-submit (and re-bill) a task that may still
    // be running upstream. See issue #21.
    if (error.taskId) {
      const entry = taskHistory.find((t) => t.taskId === error.taskId);
      if (entry) { entry.status = error.taskStillRunning ? 'timeout' : 'failed'; appendTaskLog(entry); }
      if (error.taskStillRunning) {
        text += [
          ``,
          ``,
          `⚠️ The task may still be RUNNING upstream and has likely been billed — do NOT retry the generation.`,
          `Recover the result instead:`,
          `  1. check_task task_id=${error.taskId}   (repeat until state is success/fail)`,
          `  2. download_result task_id=${error.taskId}${entry?.filename ? ` filename=${entry.filename}` : ''}`,
          `The task also appears in list_tasks.`,
        ].join('\n');
      } else {
        text += `\n\nTask ID: ${error.taskId} — the task failed upstream (failed tasks are typically not billed; verify with check_credits). Inspect with check_task task_id=${error.taskId}.`;
      }
    }
    return { content: [{ type: 'text', text }], isError: true };
  }
};

// Factory to create a configured server instance
function createMcpServer() {
  const s = new Server(SERVER_INFO, SERVER_CAPS);
  s.setRequestHandler(ListToolsRequestSchema, handleListTools);
  s.setRequestHandler(CallToolRequestSchema, handleCallTool);
  return s;
}

// ─── Dual-Mode Transport ───
// Default: stdio (for Claude Code local use)
// --http or --port=N: HTTP Streamable transport (for Cowork / remote use)

const args = process.argv.slice(2);
const httpFlag = args.includes('--http') || args.some(a => a.startsWith('--port'));
const portArg = args.find(a => a.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1]) : parseInt(process.env.KIE_MCP_PORT || '3100');

// Only stand up a transport when run as the entrypoint — importing this module
// (e.g. from unit tests) must not start a server. See issue #41.
if (isMainModule) {
if (httpFlag) {
  // HTTP Streamable mode — supports multiple concurrent sessions
  const sessions = new Map();

  const httpServer = createServer(async (req, res) => {
    // CORS headers for remote access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '4.8.0', sessions: sessions.size }));
      return;
    }

    // Only handle /mcp path
    if (req.url !== '/mcp') {
      res.writeHead(404);
      res.end('Not found. Use /mcp for MCP protocol or /health for status.');
      return;
    }

    // Check for existing session
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId);
      await transport.handleRequest(req, res);
      return;
    }

    // New session — create a fresh transport and Server instance
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (sid) => {
        sessions.set(sid, transport);
        console.error(`[kie-mcp] Session ${sid} initialized (${sessions.size} active)`);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) sessions.delete(sid);
      console.error(`[kie-mcp] Session ${sid} closed (${sessions.size} remaining)`);
    };

    // Each session gets its own Server instance with shared handler functions
    const sessionServer = createMcpServer();
    await sessionServer.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.error(`[kie-mcp] HTTP Streamable MCP server running on http://0.0.0.0:${PORT}/mcp`);
    console.error(`[kie-mcp] Health check: http://0.0.0.0:${PORT}/health`);
    console.error(`[kie-mcp] Use this URL in Cowork/remote MCP configs`);
  });
} else {
  // Stdio mode — standard Claude Code local use
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
} // end isMainModule

// ─── Exports for tests (issue #41) ───
// Pure/near-pure helpers and the registries, importable without starting a
// server. Importing this module is side-effect-free except for creating the
// (gitignored) RAW_DIR.
export {
  extractResultUrls,
  classifyKieCode,
  sanitizeFilename,
  normalizeBase64,
  resolveOutputDir,
  pollBudgetMs,
  validateModelOptions,
  getCostEstimate,
  formatCost,
  coerceDuration,
  sunoTrackName,
  isEntrypoint,
  collectUrls,
  normalizeTaskState,
  parseTaskLog,
  resolveVoice,
  PRICING,
  PRICING_ESTIMATED,
  PROMPT_CAPS,
  MODEL_REGISTRY,
  VIDEO_MODEL_REGISTRY,
  ELEVENLABS_VOICES,
  RAW_DIR,
};
