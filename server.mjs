#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';
import crypto from 'crypto';

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
const ELEVENLABS_VOICES = [
  { id: 'EkK5I93UQWFDigLMpZcX', name: 'James', vibe: 'Husky, Engaging and Bold' },
  { id: 'Z3R5wn05IrDiVCyEkUrK', name: 'Arabella', vibe: 'Mysterious and Emotive' },
  { id: 'NNl6r8mD7vthiJatiJt1', name: 'Bradford', vibe: 'Expressive and Articulate' },
  { id: 'YOq2y2Up4RgXP2HyXjE5', name: 'Xavier', vibe: 'Dominating, Metallic Announcer' },
  { id: 'B8gJV1IhpuegLxdpXFOE', name: 'Kuon', vibe: 'Cheerful, Clear and Steady' },
  { id: '2zRM7PkgwBPiau2jvVXc', name: 'Monika Sogam', vibe: 'Deep and Natural' },
  { id: '1SM7GgM6IMuvQlz2BwM3', name: 'Mark', vibe: 'Casual, Relaxed and Light' },
  { id: '5l5f8iK3YPeGga21rQIX', name: 'Adeline', vibe: 'Feminine and Conversational' },
  { id: 'scOwDtmlUjD3prqpp97I', name: 'Sam', vibe: 'Support Agent' },
  { id: 'NOpBlnGInO9m6vDvFkFC', name: 'Spuds Oxley', vibe: 'Wise and Approachable' },
  { id: 'BZgkqPqms7Kj9ulSkVzn', name: 'Eve', vibe: 'Authentic, Energetic and Happy' },
  { id: 'wo6udizrrtpIxWGp2qJk', name: 'Northern Terry' },
  { id: 'gU0LNdkMOQCOrPrwtbee', name: 'British Football Announcer' },
  { id: 'DGzg6RaUqxGRTHSBjfgF', name: 'Brock', vibe: 'Commanding and Loud Sergeant' },
  { id: 'x70vRnQBMBu4FAYhjJbO', name: 'Nathan', vibe: 'Virtual Radio Host' },
  { id: 'Sm1seazb4gs7RSlUVw7c', name: 'Anika', vibe: 'Animated, Friendly and Engaging' },
  { id: 'P1bg08DkjqiVEzOn76yG', name: 'Viraj', vibe: 'Rich and Soft' },
  { id: 'qDuRKMlYmrm8trt5QyBn', name: 'Taksh', vibe: 'Calm, Serious and Smooth' },
  { id: 'qXpMhyvQqiRxWQs4qSSB', name: 'Horatius', vibe: 'Energetic Character Voice' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', vibe: 'Energetic, Social Media Creator' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', vibe: 'Husky Trickster' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', vibe: 'Enthusiast, Quirky Attitude' },
  { id: 'kPzsL2i3teMYv0FxEYQ6', name: 'Brittney', vibe: 'Social Media Voice - Fun, Youthful \u0026 Informative' },
  { id: 'UgBBYS2sOqTuMpoF3BR0', name: 'Mark', vibe: 'Natural Conversations' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', vibe: 'Professional, Bright, Warm' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', vibe: 'Deep, Resonant and Comforting' },
  { id: 'uYXf8XasLslADfZ2MB4u', name: 'Hope', vibe: 'Bubbly, Gossipy and Girly' },
  { id: 'gs0tAILXbY5DNrJrsM6F', name: 'Jeff', vibe: 'Classy, Resonating and Strong' },
  { id: 'DTKMou8ccj1ZaWGBiotd', name: 'Jamahal', vibe: 'Young, Vibrant, and Natural' },
  { id: 'vBKc2FfBKJfcZNyEt1n6', name: 'Finn', vibe: 'Youthful, Eager and Energetic' },
  { id: 'DYkrAHD8iwork3YSUBbs', name: 'Tom', vibe: 'Conversations \u0026 Books' },
  { id: '56AoDkrOh6qfVPDXZ7Pt', name: 'Cassidy', vibe: 'Crisp, Direct and Clear' },
  { id: 'eR40ATw9ArzDf9h3v7t7', name: 'Addison 2.0', vibe: 'Australian Audiobook \u0026 Podcast' },
  { id: 'g6xIsTj2HwM6VR4iXFCw', name: 'Jessica Anne Bogart', vibe: 'Chatty and Friendly' },
  { id: 'lcMyyd2HUfFzxdCaC4Ta', name: 'Lucy', vibe: 'Fresh \u0026 Casual' },
  { id: '6aDn1KB0hjpdcocrUkmq', name: 'Tiffany', vibe: 'Natural and Welcoming' },
  { id: 'Sq93GQT4X1lKDXsQcixO', name: 'Felix', vibe: 'Warm, Positive \u0026 Contemporary RP' },
  { id: 'flHkNRp1BlvT73UL6gyz', name: 'Jessica Anne Bogart', vibe: 'Eloquent Villain' },
  { id: '9yzdeviXkFddZ4Oz8Mok', name: 'Lutz', vibe: 'Chuckling, Giggly and Cheerful' },
  { id: 'pPdl9cQBQq4p6mRkZy2Z', name: 'Emma', vibe: 'Adorable and Upbeat' },
  { id: 'zYcjlYFOd3taleS0gkk3', name: 'Edward', vibe: 'Loud, Confident and Cocky' },
  { id: 'nzeAacJi50IvxcyDnMXa', name: 'Marshal', vibe: 'Friendly, Funny Professor' },
  { id: 'ruirxsoakN0GWmGNIo04', name: 'John Morgan', vibe: 'Gritty, Rugged Cowboy' },
  { id: 'TC0Zp7WVFzhA8zpTlRqV', name: 'Aria', vibe: 'Sultry Villain' },
  { id: 'ljo9gAlSqKOvF6D8sOsX', name: 'Viking Bjorn', vibe: 'Epic Medieval Raider' },
  { id: 'PPzYpIqttlTYA83688JI', name: 'Pirate Marshal' },
  { id: '8JVbfL6oEdmuxKn5DK2C', name: 'Johnny Kid', vibe: 'Serious and Calm Narrator' },
  { id: 'iCrDUkL56s3C8sCRl7wb', name: 'Hope', vibe: 'Poetic, Romantic and Captivating' },
  { id: 'wJqPPQ618aTW29mptyoc', name: 'Ana Rita', vibe: 'Smooth, Expressive and Bright' },
  { id: 'EiNlNiXeDU1pqqOPrYMO', name: 'John Doe', vibe: 'Deep' },
  { id: '4YYIPFl9wE5c4L2eu2Gb', name: 'Burt Reynolds™', vibe: 'Deep, Smooth and Clear' },
  { id: '6F5Zhi321D3Oq7v1oNT4', name: 'Hank', vibe: 'Deep and Engaging Narrator' },
  { id: 'YXpFCvM1S3JbWEJhoskW', name: 'Wyatt', vibe: 'Wise Rustic Cowboy' },
  { id: 'LG95yZDEHg6fCZdQjLqj', name: 'Phil', vibe: 'Explosive, Passionate Announcer' },
  { id: 'CeNX9CMwmxDxUF5Q2Inm', name: 'Johnny Dynamite', vibe: 'Vintage Radio DJ' },
  { id: 'aD6riP1btT197c6dACmy', name: 'Rachel M', vibe: 'Pro British Radio Presenter' },
  { id: 'mtrellq69YZsNwzUSyXh', name: 'Rex Thunder', vibe: 'Deep N Tough' },
  { id: 'dHd5gvgSOzSfduK4CvEg', name: 'Ed', vibe: 'Late Night Announcer' },
  { id: 'eVItLK1UvXctxuaRV2Oq', name: 'Jean', vibe: 'Alluring and Playful Femme Fatale' },
  { id: 'esy0r39YPLQjOczyOib8', name: 'Britney', vibe: 'Calm and Calculative Villain' },
  { id: 'Tsns2HvNFKfGiNjllgqo', name: 'Sven', vibe: 'Emotional and Nice' },
  { id: '1U02n4nD6AdIZ9CjF053', name: 'Viraj', vibe: 'Smooth and Gentle' },
  { id: 'AeRdCCKzvd23BpJoofzx', name: 'Nathaniel', vibe: 'Engaging, British and Calm' },
  { id: 'LruHrtVF6PSyGItzMNHS', name: 'Benjamin', vibe: 'Deep, Warm, Calming' },
  { id: '1wGbFxmAM3Fgw63G1zZJ', name: 'Allison', vibe: 'Calm, Soothing and Meditative' },
  { id: 'hqfrgApggtO1785R4Fsn', name: 'Theodore HQ', vibe: 'Serene and Grounded' },
  { id: 'MJ0RnG71ty4LH3dvNfSd', name: 'Leon', vibe: 'Soothing and Grounded' },
];
const DEFAULT_VOICE_ID = 'EkK5I93UQWFDigLMpZcX'; // James

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

if (!API_KEY) {
  console.error('KIE_API_KEY environment variable is required');
  process.exit(1);
}

if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });

// ─── Pricing Reference ───
// 1 credit ≈ $0.005 USD. Costs are approximate and may vary with bulk discounts (10% bonus at high tiers).
// Video costs scale with duration — listed cost is per-second unless noted as flat.
const PRICING = {
  // ── Image Models (credits per image) ──
  'gpt4o': 6,
  'flux-kontext-pro': 50,
  'flux-kontext-max': 100,
  'gpt-image/1.5-text-to-image': 6,
  'gpt-image/1.5-image-to-image': 6,
  'gpt-image/2-text-to-image': 8,     // latest flagship, premium pricing
  'gpt-image/2-image-to-image': 8,
  'grok-imagine/text-to-image': 4,
  'grok-imagine/image-to-image': 4,
  'flux-2/pro-text-to-image': 5,
  'flux-2/pro-image-to-image': 5,
  'flux-2/flex-text-to-image': 4,
  'flux-2/flex-image-to-image': 4,
  'bytedance/seedream': 3.5,
  'bytedance/seedream-v4-text-to-image': 3.5,
  'bytedance/seedream-v4-edit': 3.5,
  'seedream/4.5-text-to-image': 5,
  'seedream/4.5-edit': 5,
  'google/imagen4': 5,
  'google/imagen4-fast': 3,
  'google/imagen4-ultra': 10,
  'google/nano-banana': 4,
  'google/nano-banana-edit': 4,
  'nano-banana-2': 4,
  'nano-banana-pro': 24,
  'z-image': 3,
  'ideogram/character': 5,
  'ideogram/character-edit': 5,
  'ideogram/v3-reframe': 5,
  'ideogram/v3-text-to-image': 5,
  'ideogram/v3-edit': 5,
  'ideogram/v3-remix': 5,
  'ideogram/character-remix': 5,
  'qwen/text-to-image': 3,
  'qwen/image-to-image': 3,
  'qwen/image-edit': 3,
  'qwen2/image-edit': 3,
  'qwen2/text-to-image': 3,
  'recraft/crisp-upscale': 2,
  'recraft/remove-background': 2,
  'topaz/image-upscale': 4,
  'seedream/5-lite-text-to-image': 5,
  'seedream/5-lite-image-to-image': 5,
  'wan/2-7-image': 4,
  'wan/2-7-image-pro': 8,

  // ── Video Models (credits per second, unless noted) ──
  // Veo numbers empirically measured 2026-06-01 via single 8s 720p 16:9 T2V probes;
  // rates may vary with resolution/duration/aspect (see PRICING_ESTIMATED below).
  'veo-3/text-to-video': 31.25,       // 250 cr/8s ($1.25) — probed: veo3 slug
  'veo-3/image-to-video': 31.25,      // assumed same as T2V (kie buildBody sends identical model slug)
  'veo-3-fast/text-to-video': 21,     // 168 cr/8s ($0.84) — probed: veo3_fast slug (likely Veo 3.1 Fast)
  'veo-3-fast/image-to-video': 21,    // assumed same as T2V
  'veo-3-lite/text-to-video': 3.75,   // 30 cr/8s ($0.15) — probed: veo3_lite slug
  'veo-3-lite/image-to-video': 3.75,  // assumed same as T2V
  'runway/text-to-video': 2.4,        // 12 credits/5s ($0.06)
  'runway/aleph-edit': 6,
  'sora/text-to-video': 3,            // ~30 credits/10s ($0.15)
  'sora/image-to-video': 3,
  'sora-pro/text-to-video': 4.5,      // ~$0.045/s at 720p
  'sora-pro/image-to-video': 4.5,
  'sora/characters': 3,
  'sora/characters-pro': 4.5,
  'sora/watermark-remover': 10,       // flat
  'sora/storyboard': 6,
  'seedance-2/text-to-video': 25,     // 720p with video input, per second
  'seedance-2-fast/text-to-video': 20,// 720p with video input, per second
  'seedance/text-to-video': 8,
  'seedance/image-to-video': 8,
  'wan/text-to-video': 4,
  'wan/image-to-video': 4,
  'wan/flash-image-to-video': 2,
  'wan/video-to-video': 4,
  'wan/turbo-image-to-video': 2,
  'wan/turbo-text-to-video': 2,
  'wan/animate-move': 3,
  'wan/animate-replace': 3,
  'wan/speech-to-video': 3,
  'wan/2-7-text-to-video': 5,
  'wan/2-7-image-to-video': 5,
  'wan/2-7-video-edit': 5,
  'wan/2-7-reference-to-video': 5,
  'wan/2-5-text-to-video': 3,
  'wan/2-5-image-to-video': 3,
  'wan/flash-video-to-video': 2,
  'hailuo/text-to-video': 8,
  'hailuo/text-to-video-standard': 4,
  'hailuo/image-to-video': 8,
  'hailuo/image-to-video-standard': 4,
  'hailuo/2-3-image-to-video-pro': 8,
  'hailuo/2-3-image-to-video-standard': 4,
  'kling/text-to-video': 10,
  'kling/image-to-video': 10,
  'kling/motion-control': 10,
  'kling-3/video': 12,
  'kling-3/motion-control': 12,
  'kling/v2-1-standard': 5,           // 25 credits/5s
  'kling/v2-1-master-text-to-video': 32,  // 160 credits/5s
  'kling/v2-1-master-image-to-video': 32,
  'kling/v2-1-pro': 10,               // 50 credits/5s
  'kling/v2-5-turbo-text-to-video': 8,
  'kling/v2-5-turbo-image-to-video': 8,
  'kling/ai-avatar-standard': 5,
  'kling/ai-avatar-pro': 10,
  'grok-imagine/text-to-video': 3,
  'grok-imagine/image-to-video': 3,
  'grok-imagine/upscale': 5,          // flat
  'grok-imagine/extend': 3,
  'bytedance/v1-pro-text-to-video': 6,
  'bytedance/v1-pro-image-to-video': 6,
  'bytedance/v1-pro-fast-image-to-video': 4,
  'bytedance/v1-lite-text-to-video': 3,
  'bytedance/v1-lite-image-to-video': 3,
  'topaz/video-upscale': 8,           // flat
  'infinitalk/from-audio': 4,
  // ── HappyHorse 1.0 (NEW April 2026) ──
  'happyhorse/text-to-video': 8,       // pricing not officially disclosed yet — estimate based on competitive positioning
  'happyhorse/image-to-video': 8,
  'happyhorse/reference-to-video': 8,
  'happyhorse/video-edit': 10,
  // ── Gemini Omni (Google, May 2026) ──
  'gemini-omni/video': 30,                // per second — estimated based on 4K capability
  'gemini-omni/voice-create': 5,          // flat per voice
  'gemini-omni/character-create': 5,      // flat per character

  // ── Audio Models ──
  'suno-music': 10,                   // flat per track
  'suno/extend-music': 10,
  'suno/cover-audio': 10,
  'suno/add-instrumental': 10,
  'suno/add-vocals': 10,
  'suno/replace-section': 8,
  'suno/generate-lyrics': 2,
  'suno/convert-to-wav': 2,
  'suno/separate-vocals': 5,
  'suno/generate-midi': 5,
  'suno/create-music-video': 8,
  'suno/generate-sounds': 5,
  'suno/generate-persona': 5,
  'suno/generate-mashup': 8,
  'suno/boost-style': 2,
  'suno/timestamped-lyrics': 2,
  'suno/cover-art': 4,
  'suno/upload-extend': 10,
  'elevenlabs/text-to-speech-turbo-2-5': 6,  // per 1000 chars, ceil-rounded (empirical 2026-06-11: 35/150/600 chars→6, 1500→12, 3000→18)
  'elevenlabs/text-to-speech-multilingual-v2': 12, // per 1000 chars, ceil-rounded (empirical 2026-06-11: 33/150 chars→12, 1500→24)
  'elevenlabs/text-to-dialogue-v3': 14, // per 1000 chars, linear no rounding (empirical 2026-06-11: 67 chars→0.98, 1330→18.62)
  'elevenlabs/audio-isolation': 3,     // flat
  'elevenlabs/speech-to-text': 3,      // flat
  // ── Utility ──
  'upload-file': 0,                    // free
  'veo/extend': 31.25,                 // per second, assumed same as veo quality
  'veo/1080p': 5,                      // flat per upscale (empirical 2026-06-01)
  'veo/4k': 120,                       // flat per upscale (empirical 2026-06-01)
  'runway/extend': 6,                  // per second
};

// Models whose PRICING numbers are inferred rather than officially disclosed by kie.ai.
// Surfaced as "(estimate — pricing not officially disclosed)" in cost display so users
// know not to budget against it exactly.
//
// Veo family: numbers above are empirically measured (2026-06-01) on a single config
// (8s 720p 16:9 T2V with audio). Kept in PRICING_ESTIMATED because the per-second rate
// MAY vary across other resolutions/durations/aspect ratios — we only probed one
// config per tier. HappyHorse + Gemini Omni rates were never officially disclosed by
// kie.ai (research-derived); flagged for the same reason.
const PRICING_ESTIMATED = new Set([
  'happyhorse/text-to-video',
  'happyhorse/image-to-video',
  'happyhorse/reference-to-video',
  'happyhorse/video-edit',
  'gemini-omni/video',
  'veo-3/text-to-video',
  'veo-3/image-to-video',
  'veo-3-fast/text-to-video',
  'veo-3-fast/image-to-video',
  'veo-3-lite/text-to-video',
  'veo-3-lite/image-to-video',
  'veo/extend',
  'veo/1080p',
  'veo/4k',
]);

function getCostEstimate(modelId, durationSec) {
  const perUnit = PRICING[modelId];
  if (!perUnit) return null;
  const note = PRICING_ESTIMATED.has(modelId) ? ' (estimate — pricing not officially disclosed)' : '';
  // Image models and flat-rate entries
  if (!durationSec) return `~${perUnit} credits (~$${(perUnit * 0.005).toFixed(3)})${note}`;
  // Per-second video models
  const total = Math.round(perUnit * durationSec);
  return `~${total} credits (~$${(total * 0.005).toFixed(2)}) for ${durationSec}s${note}`;
}

// Validate user-supplied args/model_options against the model's declared schema.
// Returns null if OK, or an error string describing the first violation.
// Runs the cheap checks the MCP SDK's low-level Server doesn't enforce: aspectRatios
// membership, options-level enum / min / max, and per-model prompt length caps
// (`modelDef.maxPromptChars`). Keeps API roundtrips for real failures.
function validateModelOptions(modelDef, args, model_options) {
  if (modelDef.aspectRatios?.length && args.aspect_ratio && !modelDef.aspectRatios.includes(args.aspect_ratio)) {
    return `aspect_ratio "${args.aspect_ratio}" not supported by this model. Allowed: ${modelDef.aspectRatios.join(', ')}`;
  }
  if (modelDef.maxPromptChars && typeof args.prompt === 'string' && args.prompt.length > modelDef.maxPromptChars) {
    return `prompt exceeds max ${modelDef.maxPromptChars} chars (got ${args.prompt.length})`;
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

const MODEL_REGISTRY = {
  // ── GPT-4o (dedicated endpoint) ──
  'gpt4o': {
    name: 'GPT-4o Image',
    description: 'Best all-rounder — LLM-first image gen with strongest instruction-following and text rendering. Warm color bias. Only 3 aspect ratios.',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', 'reasoning', 'editing', 'architecture', 'concept-art', 'game-art'],
    research: { verdict: 'Best all-rounder for instruction-following and text rendering. LLM-first architecture means it understands complex prompts. Not best for raw aesthetics (Midjourney wins) or speed (Flux wins). Warm color bias toward yellow/orange. Only 3 aspect ratios (1:1, 3:2, 2:3). Conversational editing is killer feature. 6 credits is solid mid-tier value for text-heavy professional output.', bestFor: ['text-in-image rendering (posters, infographics, UI mockups)', 'complex multi-element compositions', 'iterative conversational refinement', 'marketing materials and pitch decks', 'style transfer and retexturing', 'transparent PNG output', 'blueprint and floor plan interpretation'], weaknesses: ['warm yellow/orange color bias — specify neutral white balance', 'only 3 aspect ratios: 1:1, 3:2, 2:3', 'slow: 20-120s vs Flux 4.5s', 'hands and anatomy still problematic', 'over-sharpening artifacts', 'context bleed across chat sessions', 'non-Latin text unreliable'], promptTechniques: ['always specify aspect ratio explicitly', 'describe light sources to prevent darkening bias', 'put exact text in quotes with font style and placement', 'break complex scenes into steps via follow-up messages', 'specify color palette to counter warm bias', 'use camera/lens type for photorealism: "Canon EOS R5, 85mm f/1.4"'], communityInsights: ['290% usage increase Jan-Mar 2025; 150M+ images in first weeks (OpenAI)', '62% of generated images used professionally (OpenAI data)', 'text accuracy benchmark: near-flawless for simple text, degrades on complex compositions', 'Freepik engineering documented warm color bias with RGB scaling fix'], costEfficiency: '6 credits — mid-tier. Cost-effective for text-heavy professional output where fewer iterations needed. Midjourney cheaper per aesthetic image.', comparedTo: { 'nano-banana-2': 'NB2 is faster, cheaper (4 cr), more aspect ratios. GPT-4o wins on instruction-following and text.', 'ideogram/v3-text-to-image': 'Ideogram better for design-oriented text layouts. GPT-4o better for complex multi-element compositions.', 'flux-kontext-pro': 'Flux better for editing precision. GPT-4o better for creative ideation and text rendering.' }, lastResearched: '2026-04-19', sources: ['https://openai.com/index/introducing-4o-image-generation/', 'https://arxiv.org/abs/2504.02782', 'https://www.freepik.com/blog/fixing-openais-color-bias-with-simple-rgb-scaling/'] },
    endpoint: '/api/v1/gpt4o-image/generate',
    type: 'dedicated',
    aspectRatios: ['1:1', '3:2', '2:3'],
    options: {
      isEnhance: { type: 'boolean', default: false, description: 'Enable prompt enhancement' },
      enableFallback: { type: 'boolean', default: false, description: 'Fallback to backup model if unavailable' },
      fallbackModel: { type: 'string', enum: ['GPT_IMAGE_1', 'FLUX_MAX'], default: 'FLUX_MAX' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, size: aspectRatio, ...opts };
      if (imageUrls?.length) body.filesUrl = imageUrls;
      return body;
    },
  },

  // ── Flux Kontext (dedicated endpoint) ──
  'flux-kontext-pro': {
    name: 'Flux Kontext Pro',
    description: 'Production workhorse for AI image editing. Fastest context-aware editing. Winner over GPT-4o, DreamO for most use cases. 50 cr.',
    capabilities: ['photorealistic', 'editing', 'style-transfer', 'character-design', 'product-photography'],
    research: { verdict: 'Production workhorse for AI image editing. Fastest context-aware editing at half the cost of Max. Professional teams tested Pro vs Max vs GPT-4o vs DreamO — Pro won for most use cases on control, quality, and flexibility. Excels at iterative multi-turn editing with strong character preservation. The go-to for 90% of editing workflows.', bestFor: ['iterative multi-turn image editing', 'character consistency without fine-tuning', 'e-commerce product photography — white bg to lifestyle', 'text replacement on signs/labels/packaging', 'style transfer preserving identity', 'batch processing and high-volume production'], weaknesses: ['visual artifacts accumulate after 5+ editing turns', 'occasionally misunderstands spatial instructions', 'multiple input characters cause feature mixing', 'limited world knowledge', 'complex hand gestures still problematic', '512 token prompt limit'], promptTechniques: ['use preservation clauses: "Change X while maintaining same Y"', 'for text: ALWAYS use quotes: "Replace original with new text"', 'refer to subjects by description not pronouns', 'break complex edits into sequential single-change steps', 'add spatial anchoring for precise edits'], communityInsights: ['professional team: Pro won over Max, GPT-4o, DreamO for most use cases', 'home decor business cut photography from K/line to near-zero', 'marketing agency reduced image creation from 3 days to 3 hours', 'Artificial Analysis ranked Kontext rivaling Imagen 4 — not just editor, top-tier generator'], costEfficiency: '50 credits — same whether generating or editing. At half Max cost, delivers 90%+ quality for production work. Iterative workflow means 50 cr/step — plan edits in 2-3 steps.', comparedTo: { 'flux-kontext-max': 'Pro wins speed, cost (half), character consistency in multi-turn. Max wins typography and single-shot complex edits. Pro for 90% of work.', 'gpt4o': 'Pro is 8x faster, superior character consistency, better surgical edits. GPT-4o easier for beginners and creative ideation.' }, lastResearched: '2026-04-19', sources: ['https://bfl.ai/announcements/flux-1-kontext', 'https://fireworks.ai/blog/flux-kontext-launch', 'https://getimg.ai/blog/a-deep-dive-into-flux-1-kontext-most-powerful-image-editing-ai-yet'] },
    endpoint: '/api/v1/flux/kontext/generate',
    type: 'dedicated',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    options: {
      outputFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'png' },
      promptUpsampling: { type: 'boolean', default: false, description: 'Upsample prompt for more detail' },
      safetyTolerance: { type: 'number', min: 0, max: 6, default: 2 },
      enableTranslation: { type: 'boolean', default: true, description: 'Auto-translate non-English prompts' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'flux-kontext-pro', aspectRatio, outputFormat: 'png', ...opts };
      if (imageUrls?.length) body.inputImage = imageUrls[0];
      return body;
    },
  },
  'flux-kontext-max': {
    name: 'Flux Kontext Max',
    description: 'Premium tier — 2x Pro cost. Better typography, complex single-shot edits, style transfer fidelity. Rivals Imagen 4 in benchmarks.',
    capabilities: ['photorealistic', 'editing', 'style-transfer', 'character-design', 'typography'],
    research: { verdict: 'Premium tier for when perfection matters. Measurably better typography, superior style transfer, stronger prompt adherence on complex multi-element instructions. But 2x Pro price (100 cr) and only marginally better for most editing tasks. Reserve for hero images, premium brand campaigns, portfolio pieces, and precise typography. Also doubles as top-tier T2I — rivals Imagen 4 in benchmarks.', bestFor: ['premium typography — signs, packaging, branded materials', 'hero images for advertising campaigns', 'complex multi-element single-shot edits', 'maximum style transfer fidelity', 'print-ready assets for close-up inspection'], weaknesses: ['2x cost of Pro (100 cr)', 'slightly slower: 10-12s vs Pro 8-10s', 'occasionally introduces subtle character variations in multi-turn editing — Pro actually more consistent here', 'overkill for social media and batch processing'], promptTechniques: ['handles complex multi-element prompts better than Pro — be more ambitious', 'for typography: specify font characteristics explicitly', 'use as final polish pass after iterating with Pro'], communityInsights: ['Artificial Analysis: Max rivals Imagen 4 as T2I model, not just editor', 'professional teams: Pro still wins most use cases — Max for typography-critical work only', 'cost-conscious teams use Pro for 95%, Max only for final deliverables', 'typography results rival professional design software'], costEfficiency: '100 credits — 2x Pro. Justified for hero images replacing  photo shoots, typography-heavy work, premium client deliverables. NOT for batch processing or iteration.', comparedTo: { 'flux-kontext-pro': 'Max wins typography, complex single-shot, style transfer. Pro wins cost (half), speed, multi-turn consistency. Iterate with Pro, finish with Max.' }, lastResearched: '2026-04-19', sources: ['https://bfl.ai/announcements/flux-1-kontext', 'https://replicate.com/black-forest-labs/flux-kontext-max'] },
    endpoint: '/api/v1/flux/kontext/generate',
    type: 'dedicated',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    options: {
      outputFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'png' },
      promptUpsampling: { type: 'boolean', default: false },
      safetyTolerance: { type: 'number', min: 0, max: 6, default: 2 },
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'flux-kontext-max', aspectRatio, outputFormat: 'png', ...opts };
      if (imageUrls?.length) body.inputImage = imageUrls[0];
      return body;
    },
  },

  // ── Market models (generic createTask endpoint) ──
  // GPT Image 2 (latest — the smartest image model, OpenAI's newest)
  'gpt-image/2-text-to-image': {
    name: 'GPT Image 2',
    description: 'OpenAI\'s latest and smartest image model. 11 aspect ratios. 3s generation. Top-tier reasoning.',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', 'reasoning', 'editing', 'architecture', 'concept-art', 'game-art', 'latest'],
    type: 'market',
    apiModel: 'gpt-image-2-text-to-image',
    aspectRatios: ['auto', '1:1', '5:4', '9:16', '21:9', '16:9', '4:3', '3:2', '4:5', '3:4', '2:3'],
    options: {
      nsfw_checker: { type: 'boolean', default: false, description: 'Content filter on/off' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio || 'auto' };
      if (opts.nsfw_checker !== undefined) input.nsfw_checker = opts.nsfw_checker;
      return input;
    },
  },
  'gpt-image/2-image-to-image': {
    name: 'GPT Image 2 (img2img)',
    description: 'OpenAI flagship editor — #1 on Arena (ELO 1513 single-edit). Reasons ACROSS 16 refs for compositing. Wins multi-ref work; Flux still wins surgical edits.',
    capabilities: ['editing', 'style-transfer', 'text-rendering', 'reasoning', 'latest', 'multi-reference', 'composition'],
    research: { verdict: 'Thinking architecture genuinely separates it from the pack for editing. Arena ELO 1513 single-edit, 1464 multi-edit — #1 on both. The 16-reference capability is the killer feature: GPT2 REASONS across references rather than blending styles — feed product shot + lifestyle scene + model reference and it composites with correct lighting/shadows/perspective. Previously required a retoucher. Flux Kontext Max still wins surgical single-element edits with pixel preservation. Nano Banana Pro still wins photoreal portrait retouching. GPT2 uniquely wins multi-reference composition and text-involved edits.', bestFor: ['multi-reference compositing: product + lifestyle + model reference → coherent output', 'character consistency across series (mascots, protagonists across 20+ frames)', 'product catalogs with consistent SKUs, readable ingredient lists', 'apparel try-on: garment + model refs across body types', 'text-heavy edits: replacing copy in existing images', 'UI mockup iteration — "add dark mode" with layout awareness', 'style transfer preserving subject identity'], weaknesses: ['precise targeted edits drift — Flux Kontext Max measurably more surgical', 'font preservation weaker than Flux', 'handwritten text edits unreliable', 'brand-logo reproduction across edits flaky', 'Thinking Mode latency (15-30s) makes iterative editing sluggish', 'scaling to 16 refs unverified at max — diminishing returns likely ~6-8', 'real-person identity edits platform-restricted'], promptTechniques: ['reference images as "image 1", "image 2" in prompt — model binds semantic roles', 'explicit role labels beat ordinals: "using product in image 1, scene from image 2, lit to match image 3"', 'preservation: "keep [X] unchanged" more reliable than hoping for minimal-change', 'surgical edits: "change only the text on the sign, preserve all other pixels"', 'conversational iteration carries context in Thinking Mode', 'character consistency: generate frame 1 fully, then "same character, new scene"'], communityInsights: ['multi-reference reasoning is most-praised differentiator across WaveSpeedAI, fal.ai, ImagesPlatform, Replicate', 'Flux Kontext Max outperforms on precision edits — corroborated by 200+ scenario test (LaoZhang-AI) and Replicate comparison', 'corroborated across 3+ sources: text within edits works, fonts drift — GPT2 to add/change copy, accept typography needs post', 'unverified community: 16 refs produces diminishing returns around 6-8 — single source', 'Figma/Canva/Adobe Firefly integration at launch means GPT2 edit is default I2I backend for major design tools'], costEfficiency: '8 cr with up to 16 inputs + multi-ref reasoning is cheapest access to studio-retoucher workflow. Flux Kontext Max is 2-4x cost per edit. Rule: 8 cr GPT2 I2I for composition/combination, Flux for sniper edits.', comparedTo: { 'gpt4o': 'GPT-4o retires May 12, 2026 — deprecated', 'nano-banana-pro': 'NBP faster and cleaner for photoreal single-subject retouching. GPT2 wins multi-reference, text, compositional reasoning', 'nano-banana-2': 'NB2 not in same category for serious editing — speed/cost T2I tool', 'flux-kontext-max': 'Complements, not substitutes. Flux wins font/style preservation, single-element surgical edits, identity consistency. GPT2 wins multi-reference composition, text edits, conversational iteration, layout reasoning. Use both', 'gpt-image/1.5-image-to-image': '16-reference capability alone justifies migration; 1.5 multi-ref handling noticeably weaker' }, lastResearched: '2026-04-22', sources: ['https://openai.com/index/introducing-chatgpt-images-2-0/', 'https://fal.ai/models/openai/gpt-image-2/edit', 'https://wavespeed.ai/blog/posts/introducing-openai-gpt-image-2-edit-on-wavespeedai/', 'https://replicate.com/blog/compare-image-editing-models', 'https://blog.laozhang.ai/model-comparison/flux-kontext-max-vs-gpt-image-1-comparison-2025/'] },
    type: 'market',
    apiModel: 'gpt-image-2-image-to-image',
    requiresImage: true,
    aspectRatios: ['auto', '1:1', '5:4', '9:16', '21:9', '16:9', '4:3', '3:2', '4:5', '3:4', '2:3'],
    options: {
      nsfw_checker: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio || 'auto' };
      if (opts.nsfw_checker !== undefined) input.nsfw_checker = opts.nsfw_checker;
      return input;
    },
  },

  // GPT Image 1.5
  'gpt-image/1.5-text-to-image': {
    name: 'GPT Image 1.5',
    description: 'GPT Image 1.5 with improved prompt adherence and quality tiers',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2'],
    options: {
      quality: { type: 'string', enum: ['medium', 'high'], default: 'medium' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, aspect_ratio: aspectRatio, quality: opts.quality || 'medium' };
    },
  },
  'gpt-image/1.5-image-to-image': {
    name: 'GPT Image 1.5 (img2img)',
    description: 'GPT Image 1.5 image-to-image editing with reasoning',
    capabilities: ['editing', 'style-transfer', 'text-rendering', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2'],
    requiresImage: true,
    options: {
      quality: { type: 'string', enum: ['medium', 'high'], default: 'medium' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, quality: opts.quality || 'medium' };
    },
  },

  // Grok Imagine
  'grok-imagine/text-to-image': {
    name: 'Grok Imagine',
    description: 'Fast general-purpose image generation with Grok reasoning',
    capabilities: ['photorealistic', 'illustration', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '16:9', '9:16'],
    buildInput(prompt, aspectRatio) {
      return { prompt, aspect_ratio: aspectRatio };
    },
  },
  'grok-imagine/image-to-image': {
    name: 'Grok Imagine (img2img)',
    description: 'Image-to-image editing with Grok reasoning',
    capabilities: ['editing', 'style-transfer', 'reasoning'],
    type: 'market',
    aspectRatios: [],
    requiresImage: true,
    buildInput(prompt, _ar, imageUrls) {
      return { prompt, image_urls: imageUrls };
    },
  },

  // Flux 2
  'flux-2/pro-text-to-image': {
    name: 'Flux 2 Pro',
    description: 'High-quality Flux 2 generation with optional 2K resolution',
    capabilities: ['photorealistic', 'illustration', 'text-rendering'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/pro-image-to-image': {
    name: 'Flux 2 Pro (img2img)',
    description: 'Flux 2 Pro image-to-image with resolution control',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
    requiresImage: true,
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/flex-text-to-image': {
    name: 'Flux 2 Flex',
    description: 'Flexible Flux 2 with broad style support',
    capabilities: ['photorealistic', 'illustration'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/flex-image-to-image': {
    name: 'Flux 2 Flex (img2img)',
    description: 'Flux 2 Flex image editing',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
    requiresImage: true,
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },

  // Seedream (ByteDance)
  'bytedance/seedream': {
    name: 'Seedream 3.0',
    description: 'Seedream 3.0 with fine control via guidance scale',
    capabilities: ['photorealistic', 'illustration', 'anime'],
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      guidance_scale: { type: 'number', min: 1, max: 10, default: 2.5 },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'bytedance/seedream-v4-text-to-image': {
    name: 'Seedream 4.0',
    description: 'Seedream 4.0 with up to 4K and multi-image output',
    capabilities: ['photorealistic', 'illustration', 'anime', 'text-rendering'],
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_3_2', 'portrait_16_9', 'landscape_4_3', 'landscape_3_2', 'landscape_16_9', 'landscape_21_9'],
    options: {
      image_resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      max_images: { type: 'number', min: 1, max: 6, default: 1 },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'bytedance/seedream-v4-edit': {
    name: 'Seedream 4.0 Edit',
    description: 'Seedream 4.0 image editing with multi-image',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_3_2', 'portrait_16_9', 'landscape_4_3', 'landscape_3_2', 'landscape_16_9', 'landscape_21_9'],
    options: {
      image_resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      max_images: { type: 'number', min: 1, max: 6, default: 1 },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, image_size: aspectRatio, ...opts };
    },
  },
  'seedream/4.5-text-to-image': {
    name: 'Seedream 4.5',
    description: 'Seedream 4.5 with high-quality 4K option. Strong at 3D renders and game art.',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', '3d-render', 'game-art', 'concept-art'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic', description: 'basic=2K, high=4K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },
  'seedream/4.5-edit': {
    name: 'Seedream 4.5 Edit',
    description: 'Seedream 4.5 image editing',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },

  // Google Imagen
  'google/imagen4': {
    name: 'Imagen 4',
    description: 'Google Imagen 4 standard quality with negative prompts',
    capabilities: ['photorealistic', 'illustration', 'text-rendering'],
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      seed: { type: 'string' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },
  'google/imagen4-fast': {
    name: 'Imagen 4 Fast',
    description: 'Imagen 4 with fast generation and multi-image output',
    capabilities: ['photorealistic', 'illustration'],
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },
  'google/imagen4-ultra': {
    name: 'Imagen 4 Ultra',
    description: 'Highest quality Imagen 4 for premium output',
    capabilities: ['photorealistic', 'illustration', 'text-rendering'],
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      seed: { type: 'string' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },

  // Google Nano Banana (Gemini-based)
  'google/nano-banana': {
    name: 'Nano Banana (Gemini)',
    description: 'Gemini-based generation with broad aspect ratio support',
    capabilities: ['photorealistic', 'illustration', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', 'auto'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, output_format: opts.output_format || 'png' };
    },
  },
  'google/nano-banana-edit': {
    name: 'Nano Banana Edit',
    description: 'Gemini-based image editing with reasoning',
    capabilities: ['editing', 'reasoning'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', 'auto'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, image_size: aspectRatio, output_format: opts.output_format || 'png' };
    },
  },
  'nano-banana-2': {
    name: 'Nano Banana 2',
    description: '#1 ranked image model (Arena + ArtificialAnalysis). Gemini 3.1 Flash — 4K, web search, 14 ref images. Best value in AI at 4 cr.',
    capabilities: ['photorealistic', 'illustration', 'reasoning', 'text-rendering', 'architecture', 'product-photography'],
    research: { verdict: 'Current #1 ranked text-to-image model on Arena and ArtificialAnalysis. Gemini 3.1 Flash delivers near-Pro quality at Flash speed and half the price. 3-5s generation, 4K output, 94% text accuracy, 14 reference images. Best value in AI image generation. Not absolute best at artistic flair (Midjourney) or photorealism (Flux 2 Max) but best all-rounder for production work.', bestFor: ['high-volume marketing asset production', 'e-commerce product photography', 'text-heavy graphics (94% text accuracy)', 'character-consistent content (up to 5 chars + 14 objects)', 'rapid iteration via conversational editing', 'budget-conscious teams needing 4K at scale'], weaknesses: ['complex multi-person scenes still struggle', 'character consistency not always perfect with extreme pose changes', 'aggressive safety filters — 64% of users hit blocks', 'artistic quality lags behind Midjourney', 'iterative editing degrades after 3-4 rounds', 'peak-hour server strain causes quality drops'], promptTechniques: ['use narrative paragraphs NOT keyword lists', 'structure: Style + Subject + Setting + Action + Composition', 'wrap text in quotes + describe typography style', 'use photographic language: "85mm portrait lens", "macro shot"', 'include ALL ref images in single call with relationship markers', 'limit editing to 2-3 rounds max'], communityInsights: ['#1 on Arena and ArtificialAnalysis leaderboards March 2026', '200M+ images generated across Nano Banana family', 'marketing teams report 80% reduction in design costs', 'web search grounding enables real-time product/event references', 'Google confirmed full commercial rights — you own generated images'], costEfficiency: 'Outstanding. 4 credits = half of GPT Image 1.5 and Nano Banana Pro. For the #1 ranked model, this is remarkable value.', comparedTo: { 'gpt4o': 'GPT-4o slower (20-120s vs 3-5s) and 50% more expensive. GPT wins complex compositional prompts; NB2 wins speed, cost, editing.', 'nano-banana-pro': 'Pro costs 6x more (24 cr). Pro has World Simulator reasoning for complex scenes. NB2 is better default for 80% of use cases.', 'flux-2/pro-text-to-image': 'Flux 2 leads pure photorealism. NB2 has better text rendering and is faster.' }, lastResearched: '2026-04-19', sources: ['https://deepmind.google/models/model-cards/gemini-3-1-flash-image/', 'https://www.latent.space/p/ainews-nano-banana-2-aka-gemini-31', 'https://pxz.ai/blog/nano-banana-vs-top-ai-image-generators-complete-2026'] },
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      output_format: { type: 'string', enum: ['png', 'jpg'], default: 'jpg' },
      google_search: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.image_input = imageUrls;
      return input;
    },
  },
  'nano-banana-pro': {
    name: 'Nano Banana Pro',
    description: 'Gemini 3 Pro — ELO 1235. World Simulator reasoning for complex scenes. 94-96% text accuracy. April 2026: quality degradation reports.',
    capabilities: ['photorealistic', 'illustration', 'reasoning', 'text-rendering', 'product-photography'],
    research: { verdict: 'Premium Gemini model, ELO 1235 on LM Arena. Uses World Simulator reasoning that constructs internal scene representations before rendering. 94-96% text accuracy. However, April 2026 reports of silent quality degradation — infrastructure overload, quota issues, silent fallback to standard models. At 24 cr (6x NB2), justify the premium. Worth it for complex multi-character narratives and when absolute quality matters.', bestFor: ['complex multi-character narrative scenes', 'highest-fidelity product visualization', 'character-driven content (up to 5 consistent characters)', 'professional editorial and advertising', 'complex compositions with precise lighting and spatial reasoning'], weaknesses: ['April 2026: widespread quality degradation reports', 'silent fallback to standard model when quota exhausts', 'infrastructure overload: quality normal morning, drops afternoon', 'automatic input compression loses detail', '6x cost of NB2 — hard to justify for most tasks', 'slower than NB2 (Pro vs Flash speed)'], promptTechniques: ['leverage World Simulator: describe physical properties, light interactions, spatial relationships', 'use conversational editing loop — Pro excels at iterative refinement (60-70% fewer regenerations)', 'assign names to characters for consistency tracking', 'describe key character features explicitly even with reference images'], communityInsights: ['ELO 1235 — competitive with GPT Image 1.5 (1264)', 'April 2026 quality decline reached fever pitch across Reddit and forums', 'Google silently replaced Pro with NB2 as default in Gemini App', 'Imagen 4 being deprecated June 2026 — all roads lead to Nano Banana'], costEfficiency: 'Expensive at 24 cr. 6x NB2 cost. Justified only for complex compositions where World Simulator reasoning is actually needed.', comparedTo: { 'nano-banana-2': 'NB2 is half price, faster, more ref images (14 vs 11). Reserve Pro for complex compositions.', 'gpt4o': 'Similar price tier. GPT wins prompt adherence; Pro wins conversational editing workflow.' }, lastResearched: '2026-04-19', sources: ['https://deepmind.google/models/gemini-image/pro/', 'https://help.apiyi.com/en/nano-banana-pro-quality-decline-april-2026-analysis-en.html'] },
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      output_format: { type: 'string', enum: ['png', 'jpg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.image_input = imageUrls;
      return input;
    },
  },

  // Z-Image
  'z-image': {
    name: 'Z-Image',
    description: 'Lightweight general-purpose generation at lowest cost',
    capabilities: ['photorealistic', 'illustration'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
    buildInput(prompt, aspectRatio) {
      return { prompt, aspect_ratio: aspectRatio };
    },
  },

  // Ideogram
  'ideogram/character': {
    name: 'Ideogram Character',
    description: 'Single-image character consistency. Extracts facial features from one ref photo. Simpler than LoRA but less precise. Free on ideogram.ai.',
    capabilities: ['character-design', 'illustration', 'text-rendering', 'game-art'],
    research: { verdict: 'Single-image character consistency system — extracts facial features, hairstyle, proportions from one reference and maintains across generations. Simpler and faster than LoRA training but less precise. Accessories (wings, clothing details) can drift. Three operations: base, edit (mask), remix (style transfer). Practical for mascots, storybooks, game characters, and branded content.', bestFor: ['consistent branded mascots across scenes', 'storybook and comic character illustration', 'game character concept art in multiple poses', 'character-driven social media series'], weaknesses: ['accessories drift between generations', 'clothing changes unpredictably', 'less precise than trained LoRA', 'best for faces/hair — body proportions less reliable'], promptTechniques: ['use clear, well-lit reference with face prominent', 'adjust character mask to control hair, clothing, accessories', 'specify which features matter most in prompt', 'use REALISTIC for photo consistency, FICTION for illustrated'], communityInsights: ['fast vs LoRA training — upload one image and go', 'works best for face/hair consistency; everything else approximate', 'masking control is standout feature for fine-tuning trait carryover'], costEfficiency: 'Free on ideogram.ai. Same 5 cr on kie.ai API. Extremely cost-effective vs LoRA training.', comparedTo: { 'sora/characters': 'Sora Characters is video — 95%+ consistency. Ideogram is image-only with better static quality and text.' }, lastResearched: '2026-04-19', sources: ['https://ideogram.ai/features/character', 'https://blog.fal.ai/introducing-ideogram-character/'] },
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'REALISTIC', 'FICTION'], default: 'AUTO' },
      expand_prompt: { type: 'boolean', default: true, description: 'MagicPrompt enhancement' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, reference_image_urls: imageUrls, image_size: aspectRatio, ...opts };
    },
  },
  'ideogram/character-edit': {
    name: 'Ideogram Character Edit',
    description: 'Edit images while preserving character identity',
    capabilities: ['character-design', 'editing'],
    type: 'market',
    requiresImage: true,
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'REALISTIC', 'FICTION'], default: 'AUTO' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      // Expects image_url, mask_url, reference_image_urls passed via model_options
      return { prompt, reference_image_urls: imageUrls, ...opts };
    },
  },
  'ideogram/v3-reframe': {
    name: 'Ideogram v3 Reframe (outpaint)',
    description: 'Intelligent outpainting — extend images to any aspect ratio with generated context. Cross-platform content adaptation in one click.',
    capabilities: ['outpainting', 'editing', 'multi-platform'],
    research: { verdict: 'Intelligent outpainting — extends images to different aspect ratios with generated contextual content. Killer use case: take one square image, generate Instagram (1:1), TikTok (9:16), YouTube (16:9), Stories (4:3) versions without manual cropping. Not just stretching — generates new content in extended areas. Genuine time-saver for multi-platform content teams.', bestFor: ['adapting hero image for multiple social platforms', 'converting square to widescreen for YouTube', 'extending portrait to landscape for presentations', 'e-commerce products needing multiple format variants'], weaknesses: ['extended areas may not perfectly match original style', 'complex scenes produce odd compositions when extended', 'limited to preset aspect ratios'], costEfficiency: '5 cr — exceptional value. One generation replaces what would be a Photoshop session.', comparedTo: { 'photoshop-generative-fill': 'Photoshop more precise but requires subscription and manual workflow. Ideogram is API-first and instant.' }, lastResearched: '2026-04-19', sources: ['https://developer.ideogram.ai/api-reference/api-reference/reframe-v3'] },
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'], default: 'AUTO' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
    },
    buildInput(_prompt, aspectRatio, imageUrls, opts) {
      return { image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },

  // Qwen
  'qwen/text-to-image': {
    name: 'Qwen Text-to-Image',
    description: 'Qwen generation with fine inference step control. Good for anime and illustration at low cost.',
    capabilities: ['illustration', 'photorealistic', 'anime', 'game-art'],
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      num_inference_steps: { type: 'number', min: 2, max: 250, default: 30 },
      guidance_scale: { type: 'number', min: 0, max: 20, default: 2.5 },
      negative_prompt: { type: 'string' },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'qwen/image-to-image': {
    name: 'Qwen Image-to-Image',
    description: 'Qwen image-to-image with strength control',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    requiresImage: true,
    options: {
      strength: { type: 'number', min: 0, max: 1, default: 0.8 },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], ...opts };
    },
  },
  'qwen/image-edit': {
    name: 'Qwen Image Edit',
    description: 'Qwen image editing with fine-grained controls',
    capabilities: ['editing'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      num_inference_steps: { type: 'number', min: 2, max: 49, default: 25 },
      guidance_scale: { type: 'number', min: 0, max: 20, default: 4 },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      negative_prompt: { type: 'string' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'] },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },
  'qwen2/image-edit': {
    name: 'Qwen2 Image Edit',
    description: 'Qwen2 improved image editing',
    capabilities: ['editing'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },

  // Recraft (utility)
  'recraft/crisp-upscale': {
    name: 'Recraft Upscale',
    description: 'AI image upscaling with detail enhancement',
    capabilities: ['upscale'],
    type: 'market',
    requiresImage: true,
    buildInput(_prompt, _ar, imageUrls) {
      return { image: imageUrls?.[0] };
    },
  },
  'recraft/remove-background': {
    name: 'Recraft Remove Background',
    description: 'Clean AI-powered background removal',
    capabilities: ['background-removal'],
    type: 'market',
    requiresImage: true,
    buildInput(_prompt, _ar, imageUrls) {
      return { image: imageUrls?.[0] };
    },
  },

  // Topaz (utility)
  'topaz/image-upscale': {
    name: 'Topaz Image Upscale',
    description: 'Topaz AI upscale up to 8x resolution',
    capabilities: ['upscale'],
    type: 'market',
    requiresImage: true,
    options: {
      upscale_factor: { type: 'string', enum: ['1', '2', '4', '8'], default: '2' },
    },
    buildInput(_prompt, _ar, imageUrls, opts) {
      return { image_url: imageUrls?.[0], upscale_factor: opts.upscale_factor || '2' };
    },
  },

  // ── Seedream 5.0 Lite (ByteDance) ──
  'seedream/5-lite-text-to-image': {
    name: 'Seedream 5.0 Lite',
    description: 'Seedream 5.0 Lite with 2K/4K quality tiers. Great for 3D renders and game art.',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', '3d-render', 'game-art', 'concept-art'],
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic', description: 'basic=2K, high=4K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },
  'seedream/5-lite-image-to-image': {
    name: 'Seedream 5.0 Lite (img2img)',
    description: 'Seedream 5.0 Lite image-to-image editing',
    capabilities: ['editing', 'style-transfer'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },

  // ── Ideogram v3 ──
  'ideogram/v3-text-to-image': {
    name: 'Ideogram v3',
    description: 'Text-in-image specialist. 90% text accuracy, Style Code system (4.3B presets), 3 speed tiers. Not for photorealistic people.',
    capabilities: ['illustration', 'text-rendering', 'photorealistic', 'concept-art', 'design', 'logo', 'typography'],
    research: { verdict: 'The original king of text-in-images, still elite for typography but no longer uncontested — GPT Image 1.5 and Seedream 4.5 have caught up. Remains specialist choice for logos, posters, marketing banners. Style Code system (4.3B presets), three rendering tiers (TURBO/BALANCED/QUALITY), Magic Prompt. Photorealism and human faces are genuine weaknesses. At 5 cr, cost-efficient for its niche.', bestFor: ['logos and brand identity with readable text', 'marketing posters and banners with typography', 'product label mockups and packaging', 'T-shirt slogans and print-on-demand', 'any image where text accuracy is primary requirement'], weaknesses: ['human faces render with unnatural textures — portraits are weakest area', 'photorealism trails Flux and Midjourney', 'complex multi-text compositions drop below 90% accuracy', 'non-Latin scripts only ~3.79/5', 'VibeDex 2026 ranks it #11/18 overall — competition has narrowed'], promptTechniques: ['put ALL text in quotation marks', 'add "all caps" or "title case" to reduce typos', 'keep text to 5-7 words for near-perfect accuracy', 'set Style to Design for cleaner compositions', 'use TURBO for drafts, BALANCED for production, QUALITY for finals', 'describe font properties not font names: "bold sans-serif" not "Helvetica"'], communityInsights: ['designers use as rapid concept tool before Illustrator — cuts iteration time dramatically', 'simple text (NYC, BEACH) renders perfectly; complex compositions less reliable', 'Style Code system with 4.3B presets is hidden power feature for brand consistency', 'consensus: best for text, mediocre for people, good enough for commercial design'], costEfficiency: '5 cr — excellent for text-heavy design. TURBO /bin/zsh.03, BALANCED /bin/zsh.06, QUALITY /bin/zsh.09 direct. Three tiers are cost optimization feature.', comparedTo: { 'gpt4o': 'GPT now matches text accuracy. GPT wins complex compositions; Ideogram wins design-oriented layouts and logo work.', 'nano-banana-2': 'NB2 has 94% text accuracy at 4 cr. Ideogram has Style Codes and design-focused workflow. Close competitors.' }, lastResearched: '2026-04-19', sources: ['https://ideogram.ai/features/3.0', 'https://vibedex.ai/blog/ideogram-3-review', 'https://pxz.ai/blog/ideogram-ai-review-2026'] },
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'], default: 'AUTO' },
      expand_prompt: { type: 'boolean', default: true, description: 'MagicPrompt enhancement' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'ideogram/v3-edit': {
    name: 'Ideogram v3 Edit',
    description: 'Ideogram v3 inpainting and mask-based editing',
    capabilities: ['editing', 'text-rendering'],
    type: 'market',
    requiresImage: true,
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      expand_prompt: { type: 'boolean', default: true },
      mask_url: { type: 'string', description: 'Mask image URL for inpainting' },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const { mask_url, ...rest } = opts;
      return { prompt, image_url: imageUrls?.[0], mask_url, ...rest };
    },
  },
  'ideogram/v3-remix': {
    name: 'Ideogram v3 Remix',
    description: 'Remix existing images with style and strength control',
    capabilities: ['style-transfer', 'editing'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'], default: 'AUTO' },
      expand_prompt: { type: 'boolean', default: true },
      strength: { type: 'number', min: 0.01, max: 1.0, default: 0.5 },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },
  'ideogram/character-remix': {
    name: 'Ideogram Character Remix',
    description: 'Remix with character reference preservation',
    capabilities: ['character-design', 'style-transfer'],
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'REALISTIC', 'FICTION'], default: 'AUTO' },
      expand_prompt: { type: 'boolean', default: true },
      strength: { type: 'number', min: 0.01, max: 1.0, default: 0.5 },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], reference_image_urls: imageUrls?.slice(1), image_size: aspectRatio, ...opts };
    },
  },

  // ── Wan 2.7 Image ──
  'wan/2-7-image': {
    name: 'Wan 2.7 Image',
    description: 'Wan 2.7 with thinking mode and up to 4K output',
    capabilities: ['photorealistic', 'illustration', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '16:9', '4:3', '21:9', '3:4', '9:16', '8:1', '1:8'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      n: { type: 'number', min: 1, max: 4, default: 1, description: 'Number of images to generate' },
      thinking_mode: { type: 'boolean', default: false },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.input_urls = imageUrls;
      return input;
    },
  },
  'wan/2-7-image-pro': {
    name: 'Wan 2.7 Image Pro',
    description: 'Wan 2.7 Pro with higher quality reasoning-backed output',
    capabilities: ['photorealistic', 'illustration', 'reasoning'],
    type: 'market',
    aspectRatios: ['1:1', '16:9', '4:3', '21:9', '3:4', '9:16', '8:1', '1:8'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      n: { type: 'number', min: 1, max: 4, default: 1 },
      thinking_mode: { type: 'boolean', default: false },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.input_urls = imageUrls;
      return input;
    },
  },

  // ── Qwen2 Text-to-Image ──
  'qwen2/text-to-image': {
    name: 'Qwen2 Text-to-Image',
    description: 'Qwen2 text-to-image generation',
    capabilities: ['illustration', 'photorealistic'],
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
};

// ─── Video Model Registry ───
// Video models use either dedicated endpoints or the generic /api/v1/jobs/createTask endpoint.
// Models with type='dedicated' have their own generate + poll endpoints.
// Models with type='market' go through createTask and poll via /api/v1/jobs/recordInfo.
const VIDEO_MODEL_REGISTRY = {
  // ── Dedicated endpoint models ──
  'veo-3/text-to-video': {
    name: 'Veo 3.1 Quality (Google)',
    description: 'Crown jewel of AI video. 7.2/10 benchmark, best prompt adherence (7.8/10). Native 48kHz audio with sub-120ms lip-sync. ~/clip but only 1-in-4 keepers for pro work.',
    capabilities: ['cinematic', 'audio', 'image-to-video', 'lip-sync'],
    research: { verdict: 'Crown jewel of AI video. Scores 7.2/10 on Curious Refuge benchmark with best prompt adherence (7.8/10) and motion quality (7.4/10). Native 48kHz audio with sub-120ms lip-sync latency. ~/clip but only 1-in-4 generations are keeper quality for pro work, making effective cost ~ per usable clip. Use for finals, hero shots, dialogue scenes. Prototype on Fast first.', bestFor: ['cinematic brand storytelling', 'dialogue scenes with lip-synced audio', 'product demos with accurate physics', 'film pre-visualization', 'broadcast-quality B-roll', '4K upscale-ready masters'], weaknesses: ['~ per 8s clip, effective ~ per usable clip', '8s max clip length', 'temporal consistency degrades on fast motion', 'text rendering unreliable', 'character identity melts after 5s', 'hands/fingers unnatural', 'English-centric lip sync only'], promptTechniques: ['5-part formula: [Cinematography]+[Subject]+[Action]+[Context]+[Style]', 'lead with camera language: "Medium shot, 85mm anamorphic"', 'aim for 100-150 words', 'use concrete verbs: "opens umbrella" not "experiences rain"', 'use quotation marks for dialogue', 'describe audio with SFX tags: "SFX: thunder cracks"', 'use timestamp prompting for multi-shot: [00:00-00:02] Wide...', 'name real light sources (neon signs, candlelight, golden hour)'], communityInsights: ['78% positive ROI by advertising professionals (92-respondent survey)', 'professional workflow: Fast for 80%, Quality for final 20%', 'over 275 million Veo videos created worldwide', 'one creator burned  in 8 days learning to prompt — real cost is 3-4x advertised'], costEfficiency: 'Premium at 50 cr/s (~/bin/zsh.25/s). 5x more than Kling 3.0. Justified only for final deliverables where cinematic quality and native audio are non-negotiable.', comparedTo: { 'kling-3/video': 'Kling wins on multi-shot, cost, 4K. Veo wins on cinematic polish and audio.', 'sora/text-to-video': 'Sora leads physics. Veo generates 30-40% faster with better audio.', 'seedance-2/text-to-video': 'Seedance has better creative control. Veo wins on cinematic polish.' }, lastResearched: '2026-04-19', sources: ['https://deepmind.google/models/veo/', 'https://curiousrefuge.com/blog/veo-31-quality-ai-video-generator-review', 'https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableFallback: { type: 'boolean', default: false, description: 'Fallback to backup model if unavailable' },
      enableTranslation: { type: 'boolean', default: true, description: 'Auto-translate non-English prompts' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },
  'veo-3/image-to-video': {
    name: 'Veo 3.1 Quality I2V (Google)',
    description: 'I2V with "Ingredients to Video" — up to 3-4 reference images lock character identity. Higher keeper rate than T2V.',
    capabilities: ['cinematic', 'audio', 'image-to-video', 'character'],
    research: { verdict: 'Same endpoint as T2V but reference images solve character drift. "Ingredients to Video" accepts up to 3-4 references (face, outfit, environment) for rock-solid identity. Higher keeper rate than T2V since images anchor composition.', bestFor: ['character-consistent narrative scenes', 'animating product photos', 'multi-shot visual continuity', 'storyboard frame to video'], weaknesses: ['same /bin/zsh.25/s pricing', '8s max', 'complex multi-character interactions still imperfect'], promptTechniques: ['provide sharp, well-lit references', 'up to 3 refs: face, outfit/pose, environment', 'prefix with "Using the provided images for [subject]..."'], communityInsights: ['I2V more consistent than T2V — reference images do the heavy lifting', 'higher keeper rate partially offsets premium cost'], costEfficiency: 'Same 50 cr/s but higher keeper rate makes effective cost lower than T2V for character work.', comparedTo: { 'veo-3/text-to-video': 'Same price, but I2V locks identity — better for character work.' }, lastResearched: '2026-04-19', sources: ['https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableFallback: { type: 'boolean', default: false },
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },
  'veo-3-fast/text-to-video': {
    name: 'Veo 3.1 Fast (Google)',
    description: 'Rational default for most workflows. 92-99% of Quality at 20% price. Professional consensus: "Fast for 80%, Quality for final 20%."',
    capabilities: ['cinematic', 'fast', 'audio', 'image-to-video'],
    research: { verdict: 'The rational default. 92-99% of Quality at 20% of the price. Generates in half the time. Professional consensus: use Fast for 80% of work, Quality for the 20% that ships. Quality gap only visible on demanding scenes with extreme detail. For social media, internal presentations, SaaS demos — Fast is the correct choice.', bestFor: ['iterative prompt exploration', 'social media at volume', 'SaaS product demos', 'internal presentations', 'A/B testing creative directions'], weaknesses: ['slightly lower prompt adherence', 'extreme textures less refined', 'audio rated Good vs Quality Highest', '8s max'], promptTechniques: ['same 5-part formula works', 'more forgiving of simpler prompts', 'keep scenes simpler than Quality attempts'], communityInsights: ['quality gap only 1-8% — far smaller than 5x price gap suggests', 'developers building production apps reach for Fast first', 'the sweet spot of the Veo lineup'], costEfficiency: 'Clear value champion at 10 cr/s — 92-99% of Quality at 20% price. Rational default.', comparedTo: { 'veo-3/text-to-video': 'Only 1-8% quality gap but 5x cheaper.', 'veo-3-lite/text-to-video': '~2x cost of Lite but meaningfully better on detail.' }, lastResearched: '2026-04-19', sources: ['https://www.mindstudio.ai/blog/veo-3-1-vs-fast-vs-light-comparison'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableFallback: { type: 'boolean', default: false },
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3_fast', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },
  'veo-3-fast/image-to-video': {
    name: 'Veo 3.1 Fast I2V (Google)',
    description: 'Pragmatic workhorse for character-consistent video at scale. Reference images compensate for Fast quality tier.',
    capabilities: ['cinematic', 'fast', 'audio', 'image-to-video', 'character'],
    research: { verdict: 'Pragmatic workhorse for character-consistent video at scale. Reference image anchoring compensates for Fast quality tier — images do the heavy lifting regardless of model tier. At 10 cr/s viable for batch production.', bestFor: ['batch social media from product photos', 'animating brand assets at volume', 'character-consistent series on budget', 'rapid I2V prototyping'], weaknesses: ['slightly less detail than Quality I2V', 'audio step below Quality', '8s limit'], costEfficiency: '10 cr/s — reference images compensate for lower quality, making this better relative value than Fast T2V.', comparedTo: { 'veo-3/image-to-video': 'Marginally less refined but 5x cheaper — default for I2V iteration.' }, lastResearched: '2026-04-19', sources: ['https://wavespeed.ai/blog/posts/introducing-google-veo3-1-lite-image-to-video-on-wavespeedai/'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableFallback: { type: 'boolean', default: false },
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3_fast', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },
  'runway/text-to-video': {
    name: 'Runway Aleph',
    description: 'Runway Aleph with 720p/1080p and 5-10s duration',
    capabilities: ['cinematic', 'animation'],
    type: 'dedicated',
    endpoint: '/api/v1/runway/generate',
    pollEndpoint: '/api/v1/runway/record-detail',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', enum: [5, 10], default: 5, description: 'Duration in seconds' },
      quality: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, aspectRatio, duration: opts.duration || 5, quality: opts.quality || '720p' };
      if (imageUrls?.length) body.imageUrl = imageUrls[0];
      return body;
    },
  },
  'runway/aleph-edit': {
    name: 'Runway Aleph Edit',
    description: 'Edit existing videos with text prompts and reference images',
    capabilities: ['cinematic', 'editing'],
    type: 'dedicated',
    endpoint: '/api/v1/aleph/generate',
    pollEndpoint: '/api/v1/runway/record-detail',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      video_url: { type: 'string', description: 'Input video URL to edit' },
      seed: { type: 'number' },
      referenceImage: { type: 'string', description: 'Reference image URL for style/character' },
    },
    buildBody(prompt, aspectRatio, _imageUrls, opts) {
      const body = { prompt, aspectRatio };
      if (opts.video_url) body.videoUrl = opts.video_url;
      if (opts.seed) body.seed = opts.seed;
      if (opts.referenceImage) body.referenceImage = opts.referenceImage;
      return body;
    },
  },
  'veo-3-lite/text-to-video': {
    name: 'Veo 3 Lite (Google)',
    description: 'Budget play at 5 cr/s. 10x cheaper than Quality. Native audio included. Strategy: generate 10 variants, pick best.',
    capabilities: ['cinematic', 'fast', 'image-to-video', 'audio'],
    research: { verdict: 'Budget play at 5 cr/s — 10x cheaper than Quality. Generates at same speed as Fast. Native audio included. Quality gap real but only shows on demanding scenes. At this price, generate 10 variants and cherry-pick. Not for broadcast but more than sufficient for social media, e-commerce, previsualization.', bestFor: ['high-volume social media', 'product marketing clips', 'previsualization', 'internal comms', 'generating many variants to cherry-pick', 'any workflow where /bin/zsh.20/clip economics matter'], weaknesses: ['no 4K', 'no video extension', 'prompt adherence rated Fair', 'motion coherence rated Adequate', 'the AI look more pronounced'], promptTechniques: ['keep prompts simpler and cleaner', 'one subject, one action, one setting', 'generate multiple variants at this price', 'avoid fine detail: hands, text, instruments'], communityInsights: ['quality gap imperceptible on small screens — fine for mobile-first', 'at this price strategy shifts from "get it right first try" to "generate 10, pick best"'], costEfficiency: 'Volume play at 5 cr/s — 10x cheaper than Quality, 2x cheaper than Fast. Generate-and-pick workflow.', comparedTo: { 'veo-3-fast/text-to-video': 'Fast is ~2x more but meaningfully better on detail.', 'wan/text-to-video': 'Wan offers more control and 15s; Lite wins on cost for simple high-volume.' }, lastResearched: '2026-04-19', sources: ['https://blog.google/innovation-and-ai/technology/ai/veo-3-1-lite/', 'https://9to5google.com/2026/03/31/veo-3-1-lite/'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3_lite', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },
  'veo-3-lite/image-to-video': {
    name: 'Veo 3 Lite I2V (Google)',
    description: 'Cheapest I2V in Google ecosystem at 5 cr/s. Reference images compensate for Lite quality more than they help Quality.',
    capabilities: ['cinematic', 'fast', 'image-to-video', 'audio'],
    research: { verdict: 'Cheapest I2V in Google ecosystem at 5 cr/s. Key insight: reference images help Lite MORE than they help Quality — image anchoring compensates for weaker prompt adherence. Makes Lite I2V a better relative value vs Lite T2V.', bestFor: ['batch e-commerce product animation', 'social media photo-to-video at scale', 'animating brand assets for lightweight marketing'], weaknesses: ['lower detail preservation', 'audio basic — ambient only', 'no 4K', '8s limit', 'sharp input images mandatory at this tier'], costEfficiency: 'Most affordable I2V at 5 cr/s — reference images compensate for lower quality, making better relative value than Lite T2V.', comparedTo: { 'veo-3-lite/text-to-video': 'Same price but I2V gets more mileage from Lite since images compensate for weak prompts.' }, lastResearched: '2026-04-19', sources: ['https://wavespeed.ai/blog/posts/introducing-google-veo3-1-lite-image-to-video-on-wavespeedai/'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'veo3_lite', aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) body.imageUrls = imageUrls;
      return body;
    },
  },

  // ── Market models (createTask endpoint) ──

  // ── Sora 2 (OpenAI) ──
  'sora/text-to-video': {
    name: 'Sora 2 (OpenAI)',
    description: 'Best physics simulator in AI video at cheapest price (3 cr/s). Native audio sync. WARNING: API shutting down Sept 24, 2026.',
    capabilities: ['cinematic', 'animation', 'physics', 'audio'],
    research: { verdict: 'Best physics simulator in AI video and cheapest serious model at 3 cr/s. Native audio sync (coffee cups clink, footsteps match). Quality inconsistent — OpenAI acknowledged compute shortages. Text rendering ~5% readable. WARNING: Sora app shuts down April 26, 2026. API shuts down September 24, 2026. Dead-end for production pipelines.', bestFor: ['physics-heavy scenes (liquids, gravity, collisions)', 'rapid concept prototyping at low cost', 'short-form social media (5-10s)', 'scenes needing synchronized ambient audio'], weaknesses: ['text rendering almost completely broken', 'quality varies by server load', 'API shutting down September 2026', 'content moderation overly aggressive', 'character consistency drifts without Characters feature'], promptTechniques: ['structure: scene description, cinematography, actions, dialogue', 'use specific film terms: "medium close-up, shallow DoF, warm backlight"', 'break actions into countable beats', 'specify 3-5 anchor colors for palette', 'keep ONE camera move and ONE subject action per shot', 'generate 4s clips and stitch rather than 8s+'], communityInsights: ['Reddit: "7.5/10 tool trapped in 5/10 access system"', 'generate early morning US time (6-8 AM EST) for best quality', 'daily caps 7-15 clips depending on load', 'physics praised as comparable to Veo 3'], costEfficiency: 'Cheapest serious model at 3 cr/s. 10s clip costs ~/bin/zsh.15 via kie-art vs .00 official. Exceptional prototyping value.', comparedTo: { 'veo-3/text-to-video': 'Veo has better resolution and color grading. Sora has better physics and audio sync.', 'kling-3/video': 'Kling offers 4K/60fps and better humans. Sora has superior physics and audio sync.' }, lastResearched: '2026-04-19', sources: ['https://openai.com/index/sora-2/', 'https://the-decoder.com/openai-sets-two-stage-sora-shutdown-with-app-closing-april-2026-and-api-following-in-september/'] },
    type: 'market',
    apiModel: 'sora-2-text-to-video',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    aspectRatios: ['landscape', 'portrait', 'square'],
    options: {
      n_frames: { type: 'string', enum: ['10', '20'], default: '10', description: '10=short, 20=long' },
      remove_watermark: { type: 'boolean', default: true },
      upload_method: { type: 'string', default: 's3' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      let ar = aspectRatio;
      if (ar === '16:9') ar = 'landscape';
      else if (ar === '9:16') ar = 'portrait';
      else if (ar === '1:1') ar = 'square';
      return { prompt, aspect_ratio: ar, n_frames: opts.n_frames || '10', remove_watermark: opts.remove_watermark !== false, upload_method: opts.upload_method || 's3' };
    },
  },
  'sora/image-to-video': {
    name: 'Sora 2 I2V (OpenAI)',
    description: 'Where Sora truly shines — image anchoring + physics = most realistic contact dynamics. Cheapest I2V with audio at 3 cr/s. API shutdown Sept 2026.',
    capabilities: ['cinematic', 'animation', 'physics', 'image-to-video', 'audio'],
    research: { verdict: 'Where Sora truly shines. Image anchoring locks composition and the physics engine produces the most realistic contact dynamics, cloth simulation, and secondary motion in the field. At 3 cr/s the cheapest I2V with native audio. Community rates I2V higher than T2V — reference images eliminate the lottery. API shutdown Sept 2026.', bestFor: ['animating product shots', 'bringing concept art to life', 'physics-heavy animations from statics', 'creating motion from AI-generated images'], weaknesses: ['input should match target resolution', 'character details drift after ~10s', 'multi-character scenes from single ref often fail', 'API shutting down Sept 2026'], promptTechniques: ['match input resolution to output target exactly', 'describe motion relative to image', 'specify what should NOT move', 'for products: describe camera orbit precisely'], communityInsights: ['I2V achieves 85-90% character consistency vs 70-80% prompting alone', 'best workflow: generate still with Flux/DALL-E, animate with Sora I2V', 'community rates I2V higher than T2V overall'], costEfficiency: '3 cr/s — same as T2V but better results due to image anchoring. Best value I2V available.', comparedTo: { 'veo-3/image-to-video': 'Veo has better polish; Sora has better physics and audio.', 'kling/image-to-video': 'Kling better for humans; Sora for objects and environments.' }, lastResearched: '2026-04-19', sources: ['https://wavespeed.ai/blog/posts/wan-2-7-vs-seedance-2-vs-sora-2-vs-veo-3-1-fast-image-to-video-comparison/'] },
    type: 'market',
    apiModel: 'sora-2-image-to-video',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    requiresImage: true,
    aspectRatios: ['landscape', 'portrait', 'square'],
    options: {
      n_frames: { type: 'string', enum: ['10', '20'], default: '10' },
      remove_watermark: { type: 'boolean', default: true },
      upload_method: { type: 'string', default: 's3' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      let ar = aspectRatio;
      if (ar === '16:9') ar = 'landscape';
      else if (ar === '9:16') ar = 'portrait';
      else if (ar === '1:1') ar = 'square';
      return { prompt, image_urls: imageUrls, aspect_ratio: ar, n_frames: opts.n_frames || '10', remove_watermark: opts.remove_watermark !== false, upload_method: opts.upload_method || 's3' };
    },
  },
  'sora-pro/text-to-video': {
    name: 'Sora 2 Pro (OpenAI)',
    description: 'Upgrade for client-facing work. 1080p, 25s max, handles abstract prompts. 50% premium justified for finals only. API shutdown Sept 2026.',
    capabilities: ['cinematic', 'animation', 'physics', 'audio'],
    research: { verdict: 'The upgrade for client-facing work. 1080p, 25s max, sharper textures, handles abstract/metaphorical prompts ("time melting in cityscape"). 50% premium (4.5 vs 3 cr/s) justified when output directly impacts revenue. Workflow: iterate on standard, finalize on Pro. API shutdown Sept 2026.', bestFor: ['client-facing commercial content', 'complex multi-subject scenes (8-10s)', 'abstract/metaphorical prompts', 'fine texture detail: hair, water, fabric', 'longer-form content (15-25s)'], weaknesses: ['longer queue times', 'text rendering still broken', 'expensive for prototyping', 'API shutting down Sept 2026'], promptTechniques: ['Pro handles production terms: "180-degree shutter, 65mm photochemical contrast"', 'leverage for metaphorical prompts standard cant interpret', 'Pro sustains 3-4 dialogue exchanges vs standard 1-2'], communityInsights: ['agency workflow: 10 standard variants (/bin/zsh.15 each), pick best, regenerate as Pro (/bin/zsh.45)', 'quality difference most noticeable in texture and lighting'], costEfficiency: '4.5 cr/s — 50% premium worth ONLY for finals. Iterate on standard (3 cr/s), finalize on Pro.', comparedTo: { 'sora/text-to-video': 'Pro: 1080p, 25s, sharper. Standard: cheaper for prototyping.', 'veo-3/text-to-video': 'Veo edges Pro on color grading. Pro matches on physics, beats on audio sync.' }, lastResearched: '2026-04-19', sources: ['https://www.mindstudio.ai/blog/sora-2-vs-sora-2-pro-upgrade-worth-it'] },
    type: 'market',
    apiModel: 'sora-2-pro-text-to-video',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    aspectRatios: ['landscape', 'portrait', 'square'],
    options: {
      n_frames: { type: 'string', enum: ['10', '20'], default: '10' },
      size: { type: 'string', enum: ['high'], default: 'high', description: 'Output resolution' },
      remove_watermark: { type: 'boolean', default: true },
      upload_method: { type: 'string', default: 's3' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      let ar = aspectRatio;
      if (ar === '16:9') ar = 'landscape';
      else if (ar === '9:16') ar = 'portrait';
      else if (ar === '1:1') ar = 'square';
      return { prompt, aspect_ratio: ar, n_frames: opts.n_frames || '10', size: opts.size || 'high', remove_watermark: opts.remove_watermark !== false, upload_method: opts.upload_method || 's3' };
    },
  },
  'sora-pro/image-to-video': {
    name: 'Sora 2 Pro I2V (OpenAI)',
    description: 'Best of both: image anchoring + Pro quality. 1080p, enhanced physics. For hero image → broadcast-quality video. API shutdown Sept 2026.',
    capabilities: ['cinematic', 'animation', 'physics', 'image-to-video', 'audio'],
    research: { verdict: 'Combines image anchoring with Pro-tier quality. 1080p with enhanced edge sharpness and physics simulation. Sweet spot for product commercials and brand hero animations where input image quality is already high. Iterate on standard I2V, finalize on Pro I2V. API shutdown Sept 2026.', bestFor: ['high-res product photo animation', 'cinematic concept art to motion', 'brand hero animations (fabric, glass, metal)', 'physics animations from reference (liquid pours, cloth draping)'], weaknesses: ['4.5 cr/s — expensive for iteration', 'Pro amplifies both good and bad source material', 'API shutting down Sept 2026'], promptTechniques: ['match input resolution to output exactly', 'describe micro-movements precisely', 'keep first 2s close to reference, then introduce motion'], communityInsights: ['Flux Ultra generates hero image + Sora Pro I2V animates — rivals traditional motion graphics', 'preferred model for product advertisers due to texture fidelity'], costEfficiency: '4.5 cr/s — justified when input image quality is high and output needs to be client-ready.', comparedTo: { 'sora/image-to-video': 'Pro: 1080p, sharper, handles complex motion longer. Standard: sufficient for prototyping.' }, lastResearched: '2026-04-19', sources: ['https://wavespeed.ai/blog/posts/wan-2-7-vs-seedance-2-vs-sora-2-vs-veo-3-1-fast-image-to-video-comparison/'] },
    type: 'market',
    apiModel: 'sora-2-pro-image-to-video',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    requiresImage: true,
    aspectRatios: ['landscape', 'portrait', 'square'],
    options: {
      remove_watermark: { type: 'boolean', default: true },
      upload_method: { type: 'string', default: 's3' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      let ar = aspectRatio;
      if (ar === '16:9') ar = 'landscape';
      else if (ar === '9:16') ar = 'portrait';
      else if (ar === '1:1') ar = 'square';
      return { prompt, image_urls: imageUrls, aspect_ratio: ar, remove_watermark: opts.remove_watermark !== false, upload_method: opts.upload_method || 's3' };
    },
  },
  'sora/characters': {
    name: 'Sora 2 Characters (OpenAI)',
    description: 'Unique: 95%+ persistent character identity via Cameo. No competitor matches this. Max 2 characters/generation. API shutdown Sept 2026.',
    capabilities: ['character', 'animation', 'audio'],
    research: { verdict: 'Genuinely unique — no other model offers 95%+ persistent, reusable character identities. Cameo system extracts facial geometry, skin texture, body proportions from a 3-10s reference video, creating a character_id that persists indefinitely. Max 2 characters per generation. At 3 cr/s character consistency is essentially free. Transformative for serialized content. Being discontinued — API shutdown Sept 2026.', bestFor: ['serialized content with recurring characters', 'brand mascot animations', 'short narrative films with 1-2 characters', 'social media series with consistent AI persona'], weaknesses: ['max 2 characters per generation', 'consistency degrades after ~20s', 'face upload prohibited — must use Cameo video', 'clothing drifts between generations', 'API shutting down Sept 2026'], promptTechniques: ['create character bible — copy verbatim into every prompt', 'use @character1/@character2 syntax', 'specify clothing in EVERY prompt', 'for Cameo: neutral lighting, plain background, some head movement, 1080p+'], communityInsights: ['character_ids persist indefinitely', 'Cameo achieves 95%+ consistency vs 70-80% prompting alone', 'for 3+ characters, generate separately and composite in post', 'outperforms all competitors: Runway 75-85%, Kling 70-80%, Pika 65-75%'], costEfficiency: '3 cr/s — identical to standard T2V. Character consistency is essentially a free feature. Remarkable value.', comparedTo: { 'sora/text-to-video': 'Same price but with persistent character identity. Always use Characters when characters recur.', 'kling/text-to-video': 'Kling Face Lock only 70-80% vs Sora Characters 95%+.' }, lastResearched: '2026-04-19', sources: ['https://www.aifreeapi.com/en/posts/sora-2-character-consistency', 'https://help.apiyi.com/en/sora-2-character-api-tutorial-create-reusable-characters-en.html'] },
    type: 'market',
    apiModel: 'sora-2-characters',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    options: {
      timestamps: { type: 'string', description: 'Comma-separated timestamps (e.g. "3.55,5.55")' },
      character_user_name: { type: 'string', description: 'Character user name' },
      character_prompt: { type: 'string', description: 'Character description prompt' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      return { ...opts };
    },
  },
  'sora/characters-pro': {
    name: 'Sora 2 Characters Pro (OpenAI)',
    description: '95%+ character consistency + Pro quality (1080p, 25s). For professional narratives. API shutdown Sept 2026.',
    capabilities: ['character', 'cinematic', 'audio'],
    research: { verdict: '95%+ character consistency + Pro visual quality (1080p, 25s, sharper textures). The model for professional narrative content: short films, brand campaigns with recurring spokespersons. Same 2-character limit. Character_ids created with standard work in Pro — no recreation needed. API shutdown Sept 2026.', bestFor: ['professional short films with recurring characters', 'brand campaigns with consistent spokesperson', 'narrative content needing both consistency and quality'], weaknesses: ['same 2-character max', 'same ~20s consistency ceiling', '4.5 cr/s expensive for iteration', 'API shutting down Sept 2026'], costEfficiency: '4.5 cr/s — justified for final renders of character content. Create/iterate with standard Characters (3 cr/s), render finals with Pro.', comparedTo: { 'sora/characters': 'Same system, Pro quality. Use standard for dev, Pro for delivery.' }, lastResearched: '2026-04-19', sources: ['https://www.aifreeapi.com/en/posts/sora-2-character-consistency'] },
    type: 'market',
    apiModel: 'sora-2-characters-pro',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    options: {
      origin_task_id: { type: 'string', description: 'Task ID of original video' },
      timestamps: { type: 'string', description: 'Comma-separated timestamps' },
      character_user_name: { type: 'string', description: 'Character user name' },
      character_prompt: { type: 'string', description: 'Character description prompt' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      return { ...opts };
    },
  },
  'sora/watermark-remover': {
    name: 'Sora 2 Watermark Remover',
    description: 'Removes "Made with Sora" branding. Flat 10 cr per video. Also strips C2PA metadata. API shutdown Sept 2026.',
    capabilities: ['utility'],
    research: { verdict: 'Removes "Made with Sora" watermark using AI detection and pixel reconstruction. Flat 10 credits regardless of length. Also strips C2PA metadata. Handles static and dynamic watermarks, preserves audio sync. Essentially a post-processing tax — mandatory for commercial Sora use. API shutdown Sept 2026.', bestFor: ['cleaning Sora videos for commercial use', 'client delivery', 'batch processing'], weaknesses: ['only for Sora content', 'adds processing time', 'API shutting down Sept 2026'], costEfficiency: 'Flat 10 cr — negligible overhead. Adds ~1 cr/s for 10s videos.', comparedTo: {}, lastResearched: '2026-04-19', sources: ['https://kie.ai/sora-2-watermark-remover'] },
    type: 'market',
    apiModel: 'sora-watermark-remover',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    options: {
      video_url: { type: 'string', description: 'Sora 2 video URL to remove watermark from' },
      upload_method: { type: 'string', enum: ['s3', 'oss'], default: 's3' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      return { video_url: opts.video_url, upload_method: opts.upload_method || 's3' };
    },
  },

  // ── Seedance 2.0 (ByteDance — frontier multimodal) ──
  'seedance-2/text-to-video': {
    name: 'Seedance 2.0 (ByteDance)',
    description: 'Frontier multimodal — accepts reference images, video, and audio inputs',
    capabilities: ['cinematic', 'audio', 'character', 'motion-control', 'music-video', 'lip-sync', 'multi-shot'],
    research: {
      verdict: '#1-2 on Artificial Analysis Video Arena (Elo ~1268 T2V). Unique 12-file multimodal input: up to 9 reference images, 3 videos, 3 audio files with native dual-channel stereo audio in one pass. Handles multi-shot narratives, beat-synced music videos, and coordinated multi-subject interactions. Expensive at 25 cr/s, slow at 3-5 min, aggressive content filters block realistic face references. Text rendering is broken (glyph soup). Hands still produce extra fingers in ~10% of complex scenes. The best video model for maximum control — overkill for quick one-shots.',
      bestFor: ['music videos with beat-synced audio', 'multi-shot narrative sequences', 'character-consistent branded content', 'cinematic pre-visualization', 'template replication from reference videos', 'product demos with native sound design', 'AI influencer content with lip-synced dialogue'],
      weaknesses: ['aggressive content filters block realistic face references', 'text rendering on signs/screens is garbled', 'hands produce extra fingers in ~10% of complex scenes', 'slow generation: 3-5 min per clip', 'expensive at 25 cr/s', 'max 720p on kie.ai', 'warm color bias affecting skin tones'],
      promptTechniques: ['structure: [Camera/shot], [Subject], [Action], [Environment], [Lighting], [Style]', 'keep 120-280 words — too short is unpredictable, too long dilutes', 'limit to ONE camera move per generation — multiple cause warped hands', 'upload 3/4 angle portrait as primary reference — carries most face+body info', '70/30 rule: 70% identity reference + 30% motion reference', 'for lip-sync keep sentences to 5-10 words'],
      communityInsights: ['#1-2 on Artificial Analysis Video Arena April 2026', 'stylized/illustrated references bypass face filters better than photorealistic', 'sound effects land exactly on cue without post-sync', 'Mandarin lip-sync noticeably better than English', 'use Fast for iteration, standard for final renders', '5.80% CTR on Shopify product videos vs ~1% for static images'],
      costEfficiency: 'Premium at 25 cr/s — half of Veo 3 (50 cr/s) but 6x more than Wan (4 cr/s). Justified only when you need multimodal references or native audio.',
      comparedTo: { 'veo-3/text-to-video': 'Veo 3 has better cinematic polish at 2x cost but no multimodal refs', 'sora/text-to-video': 'Sora 2 has better physics and 25s duration but no native audio', 'wan/text-to-video': 'Wan is 6x cheaper but no audio and weaker motion' },
      lastResearched: '2026-04-19',
      sources: ['https://seed.bytedance.com/en/seedance2_0', 'https://artificialanalysis.ai/video/leaderboard/text-to-video', 'https://wavespeed.ai/blog/posts/seedance-2-0-vs-kling-3-0-sora-2-veo-3-1-video-generation-comparison-2026/'],
    },
    type: 'market',
    apiModel: 'bytedance/seedance-2',
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    options: {
      duration: { type: 'number', min: 4, max: 15, default: 8, description: 'Duration in seconds (4-15)' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p' },
      generate_audio: { type: 'boolean', default: true, description: 'Generate native audio track' },
      first_frame_url: { type: 'string', description: 'Optional first frame image URL' },
      last_frame_url: { type: 'string', description: 'Optional last frame image URL' },
      reference_image_urls: { type: 'array', description: 'Up to 9 reference images for style/character' },
      reference_video_urls: { type: 'array', description: 'Up to 3 reference videos for motion/composition' },
      reference_audio_urls: { type: 'array', description: 'Up to 3 reference audio files' },
      return_last_frame: { type: 'boolean', default: false },
      web_search: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || 8, resolution: opts.resolution || '720p', generate_audio: opts.generate_audio !== false };
      if (opts.first_frame_url) input.first_frame_url = opts.first_frame_url;
      else if (imageUrls?.[0]) input.first_frame_url = imageUrls[0];
      if (opts.last_frame_url) input.last_frame_url = opts.last_frame_url;
      if (opts.reference_image_urls) input.reference_image_urls = opts.reference_image_urls;
      else if (imageUrls?.length > 1) input.reference_image_urls = imageUrls.slice(1);
      if (opts.reference_video_urls) input.reference_video_urls = opts.reference_video_urls;
      if (opts.reference_audio_urls) input.reference_audio_urls = opts.reference_audio_urls;
      if (opts.return_last_frame) input.return_last_frame = true;
      if (opts.web_search) input.web_search = true;
      return input;
    },
  },
  'seedance-2-fast/text-to-video': {
    name: 'Seedance 2.0 Fast (ByteDance)',
    description: 'Fast Seedance 2 for cost-efficient generation. Cannot generate realistic human faces.',
    capabilities: ['cinematic', 'audio', 'fast', 'stylized'],
    research: {
      verdict: 'Iteration/prototyping variant of Seedance 2 — same multimodal architecture, ~20% cheaper (20 cr/s), slightly faster (~4 min vs ~5 min). Critical limitation: CANNOT generate realistic human faces — best for stylized, animated, or non-photorealistic content. Quality gap from standard is noticeable in texture stability and face detail. Good for layout/timing checks and stylized content, not for final renders with human characters.',
      bestFor: ['rapid iteration before final Seedance 2 renders', 'stylized/animated character content', 'product showcase videos without humans', 'landscape and nature cinematics', 'abstract visual storytelling', 'high-volume social media production'],
      weaknesses: ['cannot generate realistic human faces — dealbreaker for character-driven content', 'reduced texture and face stability vs standard', 'no video or audio reference inputs', 'still slow at ~4 min despite being "fast"', 'max 720p', 'marginal speed improvement may not justify quality tradeoff'],
      promptTechniques: ['lean into stylized aesthetics — cel-shaded, illustrated, oil painting — plays to strengths', 'use first_frame_url to lock composition before animation', 'keep prompts concise — handles simpler instructions more reliably'],
      communityInsights: ['community consensus: Fast for drafts, standard for delivery', 'stylized content is where Fast matches or exceeds standard quality', 'the face restriction is the dealbreaker for most creators'],
      costEfficiency: 'Modest savings at 20 cr/s vs standard 25 cr/s — 20% discount meaningful at volume but face restriction limits use cases severely.',
      comparedTo: { 'seedance-2/text-to-video': 'Standard costs 25% more but has faces, video/audio refs, better textures', 'wan/text-to-video': 'Wan at 4 cr/s is 5x cheaper with no face restriction', 'veo-3-fast/text-to-video': 'Veo 3 Fast at 10 cr/s is half the cost with better cinematic polish' },
      lastResearched: '2026-04-19',
      sources: ['https://blog.segmind.com/seedance-2-vs-seedance-2-fast-how-video-token-pricing-actually-works/', 'https://wavespeed.ai/blog/posts/seedance-2-0-review-issues-and-alternatives/'],
    },
    type: 'market',
    apiModel: 'bytedance/seedance-2-fast',
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    options: {
      duration: { type: 'number', min: 4, max: 15, default: 8 },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p' },
      generate_audio: { type: 'boolean', default: true },
      first_frame_url: { type: 'string', description: 'Optional first frame image URL' },
      reference_image_urls: { type: 'array' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || 8, resolution: opts.resolution || '720p', generate_audio: opts.generate_audio !== false };
      if (opts.first_frame_url) input.first_frame_url = opts.first_frame_url;
      else if (imageUrls?.[0]) input.first_frame_url = imageUrls[0];
      if (opts.reference_image_urls) input.reference_image_urls = opts.reference_image_urls;
      return input;
    },
  },

  // ── Seedance 1.5 (ByteDance — legacy) ──
  'seedance/text-to-video': {
    name: 'Seedance 1.5 Pro (ByteDance)',
    description: 'Seedance 1.5 Pro with native audio and lip-sync in 8+ languages. Up to 1080p.',
    capabilities: ['cinematic', 'audio', 'lip-sync', 'dialogue'],
    research: {
      verdict: 'Previous-gen ByteDance model but still a strong mid-tier choice at 8 cr/s. Standout: native audio with lip-sync in 8+ languages (Mandarin best, English close), multi-person dialogue, synchronized foley. Supports 1080p (which Seedance 2 on kie.ai does NOT). Max 10s. Known bug: auto-exposure brightening in first 0.5s. Fast action sequences break down. For dialogue scenes and talking-head content where you need audio without post-production sync, this remains excellent value.',
      bestFor: ['dialogue scenes with lip-synced speech', 'talking-head and AI influencer content', 'cinematic mood pieces with ambient audio', 'multi-language content (8 languages)', 'product marketing with voiceover', 'short-form social media with audio'],
      weaknesses: ['max 10s duration', 'auto-exposure brightening in first 0.5s', 'fast action sequences break down', 'no multimodal reference system', 'no multi-shot capability', 'singing produces poor results', 'legacy model — no further updates expected'],
      promptTechniques: ['describe as single directive: subject/setting, motion, camera, style', 'for lip-sync write short lines (5-10 words)', 'specify camera type explicitly — "static tripod" or "slow dolly-in"', 'start at 480p for iteration then render final at 1080p', 'use emotional descriptors in dialogue: "whispered urgently", "laughed while saying"'],
      communityInsights: ['Curious Refuge: "not best overall but excels for dialogue and facial performance"', 'upscale 720p with Topaz to achieve 7-8/10 vs live-action', 'supports Shaanxi and Sichuan dialects — deep audio model', 'at 8 cr/s, native audio eliminates post-production lip-sync cost'],
      costEfficiency: 'Strong value at 8 cr/s — 2x Wan but with native audio that eliminates post-prod. 3x cheaper than Seedance 2 while supporting 1080p.',
      comparedTo: { 'seedance-2/text-to-video': 'Seedance 2 is generational leap but 3x the cost — 1.5 still better value for simple dialogue', 'wan/text-to-video': 'Wan at 4 cr/s is half the price and 15s but no audio', 'veo-3-fast/text-to-video': 'Veo 3 Fast at 10 cr/s slightly better quality with audio, costs ~25% more' },
      lastResearched: '2026-04-19',
      sources: ['https://seed.bytedance.com/en/seedance1_5_pro', 'https://curiousrefuge.com/blog/seedance-15-pro-ai-video-generator-review', 'https://kie.ai/seedance-1-5-pro'],
    },
    type: 'market',
    apiModel: 'bytedance/seedance-1.5-pro',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', enum: [8, 10], default: 8, description: 'Duration in seconds (8 or 10)' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
      generate_audio: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: String(opts.duration || 8), resolution: opts.resolution || '720p', generate_audio: opts.generate_audio || false };
    },
  },
  'seedance/image-to-video': {
    name: 'Seedance 1.5 Pro I2V (ByteDance)',
    description: 'Seedance 1.5 image-to-video. Source image quality = 80% of output quality. No audio in I2V mode.',
    capabilities: ['cinematic', 'image-to-video', 'portrait-animation', 'product-video'],
    research: {
      verdict: 'Same underlying model as T2V but anchors to a source image, locking character identity, lighting, and composition. No audio in I2V mode. Excels at subtle motion (hair sway, camera drift, breathing) but struggles with complex action. Source image quality directly determines output quality — clean, well-lit, high-res inputs produce dramatically better results. At 8 cr/s, competes well against Wan I2V (4 cr/s) with better motion quality and identity preservation.',
      bestFor: ['portrait animation with preserved character identity', 'product shot animation (turntables, reveals)', 'scenic pans from reference photos', 'social media content from existing brand photography', 'animating illustrations and concept art', 'cinematic beats matching storyboard frames'],
      weaknesses: ['no audio generation in I2V mode', 'max 10s', 'auto-exposure brightening in first 0.5s', 'complex action from static images produces jitter', 'limited to 16:9, 9:16, 1:1', 'no multi-angle reference system', 'fast camera motion creates blur'],
      promptTechniques: ['describe motion only — "gentle hair sway" or "slow dolly-in" — model needs clear direction on what moves', 'use highest quality source image possible', 'one subject motion + one camera motion maximum', 'for portraits describe emotional state not large body movements', 'avoid describing the source image in prompt — describe only what changes'],
      communityInsights: ['I2V locks character identity far more reliably than T2V with description', 'source image quality is 80% of output quality', 'workaround for audio: generate I2V, then use output as reference in Seedance 2 T2V with audio', 'handles illustrated/painted source images surprisingly well'],
      costEfficiency: '8 cr/s — same as T2V. Cheaper than Seedance 2 first_frame_url (25 cr/s) for basic I2V, 2x Wan I2V but better identity preservation.',
      comparedTo: { 'seedance-2/text-to-video': 'Seedance 2 with first_frame_url is same I2V function at 3x cost — only worth it for additional refs', 'wan/image-to-video': 'Wan I2V at 4 cr/s is half the price with 15s but Seedance has smoother motion', 'veo-3/image-to-video': 'Veo 3 I2V at 50 cr/s is broadcast-grade but 6x more expensive' },
      lastResearched: '2026-04-19',
      sources: ['https://seed.bytedance.com/en/seedance1_5_pro', 'https://curiousrefuge.com/blog/seedance-15-pro-ai-video-generator-review', 'https://wavespeed.ai/models/bytedance/seedance-v1.5-pro/image-to-video'],
    },
    type: 'market',
    apiModel: 'bytedance/seedance-1.5-pro',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', enum: [8, 10], default: 8 },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, duration: String(opts.duration || 8), resolution: opts.resolution || '720p' };
    },
  },

  // ── Wan ──
  'wan/text-to-video': {
    name: 'Wan 2.6 T2V',
    description: 'Wan 2.6 text-to-video with 15s support',
    capabilities: ['cinematic', 'animation'],
    type: 'market',
    apiModel: 'wan/2-6-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10', '15'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
    },
  },
  'wan/image-to-video': {
    name: 'Wan 2.6 I2V',
    description: 'Wan 2.6 image-to-video with 15s support',
    capabilities: ['cinematic', 'animation'],
    type: 'market',
    apiModel: 'wan/2-6-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10', '15'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
    },
  },
  'wan/flash-image-to-video': {
    name: 'Wan 2.6 Flash I2V',
    description: 'Fast Wan I2V with optional audio',
    capabilities: ['fast', 'animation', 'audio'],
    type: 'market',
    apiModel: 'wan/2-6-flash-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10', '15'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      audio: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, duration: opts.duration || '5', resolution: opts.resolution || '1080p', audio: opts.audio || false };
    },
  },
  'wan/video-to-video': {
    name: 'Wan 2.6 V2V',
    description: 'Video-to-video style transfer and editing',
    capabilities: ['editing'],
    type: 'market',
    apiModel: 'wan/2-6-video-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      video_urls: { type: 'array', description: 'Input video URL(s)' },
      duration: { type: 'string', enum: ['5', '10', '15'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      return { prompt, video_urls: opts.video_urls, duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
    },
  },
  'wan/turbo-image-to-video': {
    name: 'Wan 2.2 A14B Turbo I2V',
    description: 'Ultra-fast turbo I2V at lowest cost',
    capabilities: ['fast'],
    type: 'market',
    apiModel: 'wan/2-2-a14b-image-to-video-turbo',
    requiresImage: true,
    options: {
      resolution: { type: 'string', enum: ['720p'], default: '720p' },
      enable_prompt_expansion: { type: 'boolean', default: false },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], resolution: opts.resolution || '720p', enable_prompt_expansion: opts.enable_prompt_expansion || false, ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },
  'wan/animate-move': {
    name: 'Wan Animate Move',
    description: 'Transfer motion from reference video to image',
    capabilities: ['motion-control', 'animation'],
    type: 'market',
    apiModel: 'wan/2-2-animate-move',
    requiresImage: true,
    options: {
      video_url: { type: 'string', description: 'Motion reference video URL' },
      resolution: { type: 'string', enum: ['480p', '580p', '720p'], default: '480p' },
    },
    buildInput(_prompt, _ar, imageUrls, opts) {
      return { video_url: opts.video_url, image_url: imageUrls?.[0], resolution: opts.resolution || '480p' };
    },
  },
  'wan/animate-replace': {
    name: 'Wan Animate Replace',
    description: 'Replace subject in video while keeping motion',
    capabilities: ['motion-control', 'animation'],
    type: 'market',
    apiModel: 'wan/2-2-animate-replace',
    requiresImage: true,
    options: {
      video_url: { type: 'string', description: 'Source video URL' },
      resolution: { type: 'string', enum: ['480p', '580p', '720p'], default: '480p' },
    },
    buildInput(_prompt, _ar, imageUrls, opts) {
      return { video_url: opts.video_url, image_url: imageUrls?.[0], resolution: opts.resolution || '480p' };
    },
  },

  // ── Wan 2.7 (newest video) ──
  'wan/2-7-text-to-video': {
    name: 'Wan 2.7 T2V',
    description: 'Latest Wan 2.7 text-to-video',
    capabilities: ['cinematic', 'animation'],
    type: 'market',
    apiModel: 'wan/2-7-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'wan/2-7-image-to-video': {
    name: 'Wan 2.7 I2V',
    description: 'Latest Wan 2.7 image-to-video',
    capabilities: ['cinematic', 'animation'],
    type: 'market',
    apiModel: 'wan/2-7-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'wan/2-7-video-edit': {
    name: 'Wan 2.7 Video Edit',
    description: 'Text-guided video editing',
    capabilities: ['editing'],
    type: 'market',
    apiModel: 'wan/2-7-videoedit',
    options: {
      video_url: { type: 'string', description: 'Input video URL to edit' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      const input = { prompt, video_url: opts.video_url, resolution: opts.resolution || '1080p' };
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'wan/2-7-reference-to-video': {
    name: 'Wan 2.7 Reference-to-Video',
    description: 'Generate video from reference images for character/style',
    capabilities: ['character', 'animation'],
    type: 'market',
    apiModel: 'wan/2-7-r2v',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, reference_image_urls: imageUrls, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '1080p' };
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'wan/turbo-text-to-video': {
    name: 'Wan 2.2 A14B Turbo T2V',
    description: 'Ultra-fast turbo T2V at lowest cost',
    capabilities: ['fast'],
    type: 'market',
    apiModel: 'wan/2-2-a14b-text-to-video-turbo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p' },
      enable_prompt_expansion: { type: 'boolean', default: false },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '720p', enable_prompt_expansion: opts.enable_prompt_expansion || false, ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },

  // ── Hailuo (MiniMax) ──
  'hailuo/text-to-video': {
    name: 'Hailuo 02 Pro T2V',
    description: 'Hailuo 02 Pro with prompt optimization',
    capabilities: ['cinematic'],
    type: 'market',
    apiModel: 'hailuo/02-text-to-video-pro',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      prompt_optimizer: { type: 'boolean', default: true, description: 'Optimize prompt for better results' },
    },
    buildInput(prompt, _aspectRatio, _imgs, opts) {
      return { prompt, prompt_optimizer: opts.prompt_optimizer !== false };
    },
  },
  'hailuo/text-to-video-standard': {
    name: 'Hailuo 02 Standard T2V',
    description: 'Budget Hailuo 02 with duration control',
    capabilities: ['cinematic', 'fast'],
    type: 'market',
    apiModel: 'hailuo/02-text-to-video-standard',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      prompt_optimizer: { type: 'boolean', default: true },
    },
    buildInput(prompt, _aspectRatio, _imgs, opts) {
      return { prompt, duration: opts.duration || '6', prompt_optimizer: opts.prompt_optimizer !== false };
    },
  },
  'hailuo/image-to-video': {
    name: 'Hailuo 02 Pro I2V',
    description: 'Hailuo 02 Pro I2V with end frame support',
    capabilities: ['cinematic'],
    type: 'market',
    apiModel: 'hailuo/02-image-to-video-pro',
    requiresImage: true,
    options: {
      prompt_optimizer: { type: 'boolean', default: true },
      end_image_url: { type: 'string', description: 'Optional end frame image URL' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], prompt_optimizer: opts.prompt_optimizer !== false };
      if (opts.end_image_url) input.end_image_url = opts.end_image_url;
      return input;
    },
  },
  'hailuo/image-to-video-standard': {
    name: 'Hailuo 02 Standard I2V',
    description: 'Budget Hailuo I2V with end frame support',
    capabilities: ['cinematic', 'fast'],
    type: 'market',
    apiModel: 'hailuo/02-image-to-video-standard',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      resolution: { type: 'string', enum: ['768P'], default: '768P' },
      prompt_optimizer: { type: 'boolean', default: true },
      end_image_url: { type: 'string', description: 'Optional end frame image URL' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '6', resolution: opts.resolution || '768P', prompt_optimizer: opts.prompt_optimizer !== false };
      if (opts.end_image_url) input.end_image_url = opts.end_image_url;
      return input;
    },
  },
  'hailuo/2-3-image-to-video-pro': {
    name: 'Hailuo 2.3 Pro I2V',
    description: 'Latest Hailuo 2.3 Pro image-to-video',
    capabilities: ['cinematic'],
    type: 'market',
    apiModel: 'hailuo/2-3-image-to-video-pro',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      resolution: { type: 'string', enum: ['768P'], default: '768P' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], duration: opts.duration || '6', resolution: opts.resolution || '768P' };
    },
  },
  'hailuo/2-3-image-to-video-standard': {
    name: 'Hailuo 2.3 Standard I2V',
    description: 'Budget Hailuo 2.3 I2V',
    capabilities: ['cinematic', 'fast'],
    type: 'market',
    apiModel: 'hailuo/2-3-image-to-video-standard',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      resolution: { type: 'string', enum: ['768P'], default: '768P' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], duration: opts.duration || '6', resolution: opts.resolution || '768P' };
    },
  },

  // ── Kling ──
  'kling/text-to-video': {
    name: 'Kling 2.6 T2V',
    description: 'Kling 2.6 with native audio. Sweet spot: cheaper than 3.0 with most features minus multi-shot and 4K.',
    capabilities: ['cinematic', 'audio', 'lip-sync'],
    research: {
      verdict: 'First Kling with native audio — still a strong workhorse at good price. Motion fluidity and physics excellent. Visual fidelity good but not Veo 3.1 level. At 10 cr/s, sweet spot: cheaper than 3.0 with most features minus multi-shot and 4K.',
      bestFor: ['social media with synchronized audio', 'text-to-video with native sound', 'high-volume production at 1080p', 'human movement and action scenes'],
      weaknesses: ['no multi-shot', 'max 1080p', 'occasional artifacts in complex scenes', 'background boiling', 'interior shots prone to melting walls'],
      promptTechniques: ['4-part formula: Subject + Action + Context + Style', 'describe dialogue or sound context for better audio matching'],
      communityInsights: ['56% cheaper than Veo 3.1 with comparable audio quality', 'many creators use 2.6 over 3.0 for simple single-shot to save credits'],
      costEfficiency: 'Best value Kling for single-shot with audio. 17% cheaper than 3.0.',
      comparedTo: { 'kling-3/video': '3.0 adds multi-shot, 4K, 15s. For single-shot 1080p with audio, 2.6 is better value.', 'kling/v2-5-turbo-text-to-video': '2.6 has audio; 2.5 Turbo is 20% cheaper without.' },
      lastResearched: '2026-04-19',
      sources: ['https://www.dzine.ai/blog/kling-3-0-vs-kling-2-6/', 'https://fal.ai/learn/devs/kling-2-6-pro-vs-kling-2-5-turbo-pro'],
    },
    type: 'market',
    apiModel: 'kling-2.6/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5', description: 'Duration in seconds' },
      sound: { type: 'boolean', default: false, description: 'Generate audio' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: String(opts.duration || '5'), sound: opts.sound || false };
    },
  },
  'kling/image-to-video': {
    name: 'Kling 2.6 I2V',
    description: 'Kling 2.6 I2V with native audio — strongest image fidelity. Best for product animation and character I2V with sound.',
    capabilities: ['cinematic', 'audio', 'image-to-video'],
    research: {
      verdict: 'I2V counterpart to 2.6 T2V. Kling has historically excelled at I2V — reference images translate faithfully. Native audio means you get a video with synchronized sound from a reference image in one pass. The model to use for product photos, character illustrations, and storyboard frames that need animation with sound.',
      bestFor: ['animating product photos for e-commerce', 'bringing storyboard frames to life with audio', 'character animation from reference art', 'social media from existing visual assets'],
      weaknesses: ['same artifacts as 2.6 T2V', 'no multi-shot', 'max 1080p', 'input image quality heavily affects output'],
      promptTechniques: ['describe motion and context, not visual content', 'specify camera movement relative to subject', 'include audio context for better native audio'],
      communityInsights: ['widely regarded as best I2V model for character consistency', 'used in pharmaceutical and educational content production'],
      costEfficiency: '10 cr/s — same as T2V. More cost-effective than T2V when you have visual assets since you skip the generation lottery.',
      comparedTo: { 'kling/v2-5-turbo-image-to-video': '2.6 has audio. 2.5 Turbo is 20% cheaper for drafts.' },
      lastResearched: '2026-04-19',
      sources: ['https://www.dzine.ai/blog/kling-3-0-vs-kling-2-6/', 'https://kie.ai/kling/v2-1'],
    },
    type: 'market',
    apiModel: 'kling-2.6/image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      sound: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, duration: String(opts.duration || '5'), sound: opts.sound || false };
    },
  },
  'kling/motion-control': {
    name: 'Kling 2.6 Motion Control',
    description: 'Budget motion transfer. Same workflow as 3.0 MC but without 4K and improved physics. 17% cheaper.',
    capabilities: ['motion-control', 'animation', 'dance'],
    research: {
      verdict: 'Budget alternative to 3.0 Motion Control. Same workflow (ref image + motion video) but without 4K and improved limb tracking. Still very capable — drove initial viral trends. At 10 cr/s vs 12 for 3.0, reasonable budget choice if 1080p is acceptable.',
      bestFor: ['budget motion transfer', 'high-volume dance content', 'iterating before upgrading to 3.0', 'social media content'],
      weaknesses: ['inferior limb tracking vs 3.0', 'no 4K', 'less refined physics'],
      promptTechniques: ['identical to 3.0: describe environment and style, NOT motion', 'match framing between image and video'],
      communityInsights: ['many use 2.6 MC for drafts, upgrade to 3.0 for finals', '17% savings adds up at volume'],
      costEfficiency: '10 cr/s — 17% cheaper than 3.0. Good for drafts.',
      comparedTo: { 'kling-3/motion-control': '3.0 has better physics, 4K, limb tracking. Use 2.6 for drafts.' },
      lastResearched: '2026-04-19',
      sources: ['https://higgsfield.ai/blog/Kling-2.6-Motion-Control-Full-Guide'],
    },
    type: 'market',
    apiModel: 'kling-2.6/motion-control',
    requiresImage: true,
    options: {
      video_urls: { type: 'array', description: 'Motion reference video URL(s)' },
      mode: { type: 'string', enum: ['720p'], default: '720p' },
      character_orientation: { type: 'string', enum: ['image'], default: 'image' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, video_urls: opts.video_urls, mode: opts.mode || '720p', character_orientation: opts.character_orientation || 'image' };
    },
  },
  'kling-3/video': {
    name: 'Kling 3.0',
    description: 'Kling 3.0 — #1 general-purpose video model. Multi-shot (up to 6 cuts), native 4K, native audio, 15s max. ~80% first-try success with cinematic prompting.',
    capabilities: ['cinematic', 'audio', 'multi-shot', '4k', 'lip-sync'],
    research: {
      verdict: 'The flagship. Most capable general-purpose AI video model as of early 2026. Multi-shot storyboarding (up to 6 camera cuts in one 15s generation) is unique — no competitor matches it. Native 4K, native audio with lip-sync in 5 languages. Physics simulation is a marked step up from 2.6. 20% premium over 2.6 easily justified for production use. ~80% first-try success rate with proper cinematic prompting.',
      bestFor: ['multi-shot cinematic sequences', 'short-form social content with native audio', 'product advertisements with camera sequences', 'pre-visualization for filmmakers', '4K native resolution workflows'],
      weaknesses: ['audio degrades with 3+ speaking characters', 'close-up hair looks artificial', 'hands still occasionally produce extra fingers', 'background boiling in foliage and crowds', 'strict NSFW filter'],
      promptTechniques: ['use 4-part formula: Subject + Action + Context + Style', 'use specific camera terms: dolly push, whip-pan, crash zoom', 'keep 20-50 words for stability', 'include tactile details: grain, lens flares, fabric sheen', 'for multi-shot: define duration, shot size, camera per shot'],
      communityInsights: ['considered state-of-the-art overall by most reviewers', 'AI output shown to clients without disclosure — nobody flagged it', 'multi-shot product ads work ~80% on first attempt', 'supports 16-bit EXR export for full dynamic range in post'],
      costEfficiency: 'At 12 cr/s, 20% more than 2.6 but multi-shot + 4K + audio make it best value per production dollar.',
      comparedTo: { 'kling/text-to-video': '3.0 adds multi-shot, 4K, audio, 15s. Worth 20% premium.', 'veo-3/text-to-video': 'Veo has better color grading; Kling wins on multi-shot, cost, 4K.', 'sora/text-to-video': 'Sora leads physics simulation; Kling wins multi-shot and value.' },
      lastResearched: '2026-04-19',
      sources: ['https://curiousrefuge.com/blog/kling-30-review', 'https://a2e.ai/kling-3-0-review/', 'https://blog.fal.ai/kling-3-0-prompting-guide/'],
    },
    type: 'market',
    apiModel: 'kling-3.0/video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      mode: { type: 'string', enum: ['std', 'pro'], default: 'std' },
      sound: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: String(opts.duration || '5'), mode: opts.mode || 'std', sound: opts.sound || false, multi_shots: false };
      if (imageUrls?.length) input.image_urls = imageUrls;
      return input;
    },
  },
  'kling-3/motion-control': {
    name: 'Kling 3.0 Motion Control',
    description: 'Kling 3.0 motion transfer — reference image + motion video = precise character animation. Best motion transfer available.',
    capabilities: ['motion-control', 'character', 'animation', 'dance'],
    research: {
      verdict: 'Most precise motion transfer tool available. Provide reference image (character) + motion reference video (action) and AI fuses them. Inherits 3.0 improvements: better physics, 4K, native audio. Key constraint: reference videos must be single continuous shots with moderate speed. Best in class for dance transfers and character animation from real footage.',
      bestFor: ['dance and choreography transfer', 'animating static character art with real motion', 'social media viral content (AI dance trends)', 'transferring actor performances to stylized characters'],
      weaknesses: ['only tracks largest character in multi-person refs', 'reference must be single continuous shot', 'fast/chaotic motion produces poor results', 'scale mismatch causes warping'],
      promptTechniques: ['describe context and environment — NOT motion (reference video defines motion)', 'match framing: full-body image with full-body video', 'use moderate speed references with clear subjects', 'prompt for environment/lighting/style only'],
      communityInsights: ['AI baby dance trend driven by Kling Motion Control', 'best results from reference videos shot specifically for this purpose', 'works well with non-human characters if proportions roughly match'],
      costEfficiency: '12 cr/s — same as standard 3.0. Extremely cost-effective compared to traditional motion capture.',
      comparedTo: { 'kling/motion-control': '3.0 has better physics, 4K, limb tracking vs 2.6. Worth 20% premium.' },
      lastResearched: '2026-04-19',
      sources: ['https://curiousrefuge.com/blog/how-to-use-kling-3-motion-control', 'https://blog.fal.ai/kling-3-0-prompting-guide/'],
    },
    type: 'market',
    apiModel: 'kling-3.0/motion-control',
    requiresImage: true,
    options: {
      video_urls: { type: 'array', description: 'Motion reference video URL(s)' },
      mode: { type: 'string', enum: ['720p'], default: '720p' },
      character_orientation: { type: 'string', enum: ['image'], default: 'image' },
      background_source: { type: 'string', enum: ['input_video'], default: 'input_video' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, video_urls: opts.video_urls, mode: opts.mode || '720p', character_orientation: opts.character_orientation || 'image', background_source: opts.background_source || 'input_video' };
    },
  },
  'kling/v2-1-standard': {
    name: 'Kling V2.1 Standard',
    description: 'Absolute budget option at 5 cr/s. 720p I2V only. Good enough for social media, not for client work.',
    capabilities: ['animation', 'image-to-video'],
    research: { verdict: 'Budget option at 5 cr/s. 720p I2V only. Quality serviceable for social media and internal content but noticeably below 1080p models. For budget-conscious volume work where 720p is acceptable, perfectly adequate. Not for client-facing or production-grade work.', bestFor: ['maximum volume social media on tight budgets', 'internal communications', 'concept testing before upgrading'], weaknesses: ['720p only', 'I2V only', 'no audio, no multi-shot', 'basic motion quality'], communityInsights: ['good enough for social media, not for client work', '5 cr/s makes it practical for testing concepts', 'delivers ~/bin/zsh.50-1.00 per final video vs -15 for Veo 3'], costEfficiency: 'Best pure cr/s ratio in Kling. 2.4x more videos than 3.0 for same budget.', comparedTo: { 'kling/v2-1-pro': 'Pro is 2x cost but adds 1080p, sharpness, frame conditioning.' }, lastResearched: '2026-04-19', sources: ['https://kie.ai/kling/v2-1'] },
    type: 'market',
    apiModel: 'kling/v2-1-standard',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      return input;
    },
  },

  // ── Grok Imagine ──
  'grok-imagine/text-to-video': {
    name: 'Grok Imagine T2V',
    description: 'Grok video generation with quality modes',
    capabilities: ['animation'],
    type: 'market',
    apiModel: 'grok-imagine/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '2:3', '3:2'],
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '480p' },
      mode: { type: 'string', enum: ['normal', 'quality'], default: 'normal' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '6', resolution: opts.resolution || '480p', mode: opts.mode || 'normal' };
    },
  },
  'grok-imagine/image-to-video': {
    name: 'Grok Imagine I2V',
    description: 'Grok image-to-video with quality modes',
    capabilities: ['animation'],
    type: 'market',
    apiModel: 'grok-imagine/image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1', '2:3', '3:2'],
    options: {
      duration: { type: 'string', enum: ['6', '10'], default: '6' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '480p' },
      mode: { type: 'string', enum: ['normal', 'quality'], default: 'normal' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, duration: opts.duration || '6', resolution: opts.resolution || '480p', mode: opts.mode || 'normal' };
    },
  },
  'grok-imagine/upscale': {
    name: 'Grok Imagine Video Upscale',
    description: 'Upscale Grok videos to higher resolution',
    capabilities: ['upscale'],
    type: 'market',
    apiModel: 'grok-imagine/upscale',
    options: {
      task_id: { type: 'string', description: 'Task ID from a previously completed video generation task' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      return { task_id: opts.task_id };
    },
  },

  // ── Topaz (utility) ──
  'topaz/video-upscale': {
    name: 'Topaz Video Upscale',
    description: 'AI video upscaling with Topaz',
    capabilities: ['upscale'],
    type: 'market',
    apiModel: 'topaz/video-upscale',
    options: {
      video_url: { type: 'string', description: 'Video URL to upscale' },
      upscale_factor: { type: 'string', enum: ['2'], default: '2' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      return { video_url: opts.video_url, upscale_factor: opts.upscale_factor || '2' };
    },
  },

  // ── Sora 2 Storyboard ──
  'sora/storyboard': {
    name: 'Sora 2 Pro Storyboard (OpenAI)',
    description: 'UNIQUE: multi-scene keyframe control — up to 5 keyframes with auto transitions. No other model has this. 6 cr/s. API shutdown Sept 2026.',
    capabilities: ['storyboard', 'cinematic', 'narrative', 'multi-shot'],
    research: { verdict: 'Genuinely unique — no other AI video model offers multi-scene keyframe control. Define up to 5 keyframes, each with own scene prompt, and model generates coherent video with auto transitions and maintained world state. Transformative for narrative content. At 6 cr/s the most expensive Sora model, 3-5x slower generation. 3-frame storyboards are sweet spot. Being discontinued — API shutdown Sept 2026.', bestFor: ['multi-scene narrative sequences', 'commercial storyboard animation', 'music video scene transitions', 'product walkthroughs with multiple angles', 'proof-of-concept animatics'], weaknesses: ['most expensive Sora at 6 cr/s', '3-5x slower generation', 'max 5 keyframes', 'character drift between keyframes', '4-5 frame storyboards have high failure rates', 'API shutting down Sept 2026'], promptTechniques: ['copy character descriptions VERBATIM across all keyframes', 'include camera directions per keyframe', 'start with 2-frame storyboards before attempting 3-5', 'write each keyframe 2-4 sentences minimum', 'describe transitions through action: "turns to face door" → "door opens revealing garden"'], communityInsights: ['praised as "most director-like control in any AI video tool"', 'combine with Characters for max consistency across keyframes', '3-frame storyboards are sweet spot — reliable without excessive generation time', 'some use Storyboard for rough cut, individual T2V/I2V for polish'], costEfficiency: '6 cr/s premium — 15s 3-keyframe storyboard costs 90 cr. Compare to 3 separate 5s T2V clips at 45 cr but losing continuity. 2x premium buys auto transitions and world state.', comparedTo: { 'sora-pro/text-to-video': 'Pro T2V is single shot. Storyboard is multi-scene. Different tools.', 'veo-3/text-to-video': 'Veo has no storyboard equivalent — Sora Storyboard is a genuine competitive moat.', 'kling-3/video': 'Kling 3.0 multi-shot is similar but less controllable than Sora Storyboard keyframes.' }, lastResearched: '2026-04-19', sources: ['https://soravideo.art/blog/sora-2-storyboard', 'https://filmora.wondershare.com/trending-topic/how-to-use-sora-2-storyboard.html'] },
    type: 'market',
    apiModel: 'sora-2-pro-storyboard',
    paused: 'Paused upstream on kie.ai ("This interface is temporarily paused", observed 2026-06-11); OpenAI sunsets the Sora API Sept 24, 2026, so it may not return',
    aspectRatios: ['landscape', 'portrait', 'square'],
    options: {
      shots: { type: 'array', description: 'Array of scene objects {Scene: string, duration: number}, 1-10 scenes' },
      n_frames: { type: 'string', enum: ['10', '15', '25'], default: '10' },
      upload_method: { type: 'string', default: 's3' },
    },
    buildInput(_prompt, aspectRatio, imageUrls, opts) {
      const input = { aspect_ratio: aspectRatio, upload_method: opts.upload_method || 's3' };
      if (opts.shots) input.shots = opts.shots;
      if (opts.n_frames) input.n_frames = opts.n_frames;
      if (imageUrls?.length) input.image_urls = imageUrls;
      return input;
    },
  },

  // ── ByteDance V1 ──
  'bytedance/v1-pro-text-to-video': {
    name: 'ByteDance V1 Pro T2V',
    description: 'ByteDance V1 Pro text-to-video',
    capabilities: ['cinematic'],
    type: 'market',
    apiModel: 'bytedance/v1-pro-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p', ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },
  'bytedance/v1-pro-image-to-video': {
    name: 'ByteDance V1 Pro I2V',
    description: 'ByteDance V1 Pro image-to-video',
    capabilities: ['cinematic'],
    type: 'market',
    apiModel: 'bytedance/v1-pro-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p' };
    },
  },
  'bytedance/v1-pro-fast-image-to-video': {
    name: 'ByteDance V1 Pro Fast I2V',
    description: 'Fast ByteDance I2V at reduced cost',
    capabilities: ['cinematic', 'fast'],
    type: 'market',
    apiModel: 'bytedance/v1-pro-fast-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p' };
    },
  },
  'bytedance/v1-lite-text-to-video': {
    name: 'ByteDance V1 Lite T2V',
    description: 'Budget ByteDance T2V',
    capabilities: ['fast'],
    type: 'market',
    apiModel: 'bytedance/v1-lite-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p' };
    },
  },
  'bytedance/v1-lite-image-to-video': {
    name: 'ByteDance V1 Lite I2V',
    description: 'Budget ByteDance I2V',
    capabilities: ['fast'],
    type: 'market',
    apiModel: 'bytedance/v1-lite-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p' };
    },
  },

  // ── Wan additional models ──
  'wan/flash-video-to-video': {
    name: 'Wan 2.6 Flash V2V',
    description: 'Flash-speed video-to-video with audio option',
    capabilities: ['fast', 'editing', 'audio'],
    type: 'market',
    apiModel: 'wan/2-6-flash-video-to-video',
    options: {
      video_urls: { type: 'array', description: 'Input video URL(s)' },
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      audio: { type: 'boolean', default: false },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      return { prompt, video_urls: opts.video_urls, duration: opts.duration || '5', resolution: opts.resolution || '1080p', audio: opts.audio || false };
    },
  },
  'wan/2-5-text-to-video': {
    name: 'Wan 2.5 T2V',
    description: 'Wan 2.5 with negative prompt support',
    capabilities: ['animation'],
    type: 'market',
    apiModel: 'wan/2-5-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5', resolution: opts.resolution || '720p', ...(opts.negative_prompt ? { negative_prompt: opts.negative_prompt } : {}), ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },
  'wan/2-5-image-to-video': {
    name: 'Wan 2.5 I2V',
    description: 'Wan 2.5 image-to-video',
    capabilities: ['animation'],
    type: 'market',
    apiModel: 'wan/2-5-image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5', resolution: opts.resolution || '720p', ...(opts.negative_prompt ? { negative_prompt: opts.negative_prompt } : {}), ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },
  'wan/speech-to-video': {
    name: 'Wan 2.2 Speech-to-Video',
    description: 'Drive video from speech audio for talking heads',
    capabilities: ['talking-head', 'lip-sync'],
    type: 'market',
    apiModel: 'wan/2-2-a14b-speech-to-video-turbo',
    requiresImage: true,
    options: {
      audio_url: { type: 'string', description: 'Audio/speech URL to drive the video' },
      resolution: { type: 'string', enum: ['480p', '580p', '720p'], default: '480p' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], audio_url: opts.audio_url, resolution: opts.resolution || '480p', ...(opts.negative_prompt ? { negative_prompt: opts.negative_prompt } : {}), ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },

  // ── Kling additional models ──
  'kling/v2-5-turbo-text-to-video': {
    name: 'Kling V2.5 Turbo Pro T2V',
    description: 'Speed-optimized workhorse. 60% faster than V2.1 Master at 62% less cost. Held #1 on Artificial Analysis Arena. No audio.',
    capabilities: ['fast', 'cinematic'],
    research: { verdict: 'Speed-optimized workhorse. 60% faster than V2.1 Master at 62% less cost. Held #1 on Artificial Analysis Video Arena (Elo 1252). Cinema-grade sharpness. No native audio — best for iteration and workflows where audio is added in post.', bestFor: ['high-volume production where speed matters', 'rapid prototyping before 3.0 finals', 'social media without dialogue needs', 'budget workflows at scale'], weaknesses: ['no native audio', 'motion flatter than V2.1 Master or 3.0', 'being superseded by 2.6 and 3.0'], promptTechniques: ['same core techniques as other Kling', 'since no audio, focus purely on visual description'], communityInsights: ['held #1 on Artificial Analysis leaderboard', '2-3 min generation vs 5-10 min on older models', 'professionals use for drafts, re-render finals on 3.0'], costEfficiency: '8 cr/s — 33% cheaper than 3.0. Best cr/s for general video if you add audio in post.', comparedTo: { 'kling/text-to-video': '2.6 adds audio for 25% more. Worth it only if you need sound.', 'kling-3/video': '3.0 is 50% more expensive but vastly more capable.' }, lastResearched: '2026-04-19', sources: ['https://curiousrefuge.com/blog/kling-25-turbo-ai-video-generator-review', 'https://fal.ai/learn/devs/kling-2-6-pro-vs-kling-2-5-turbo-pro'] },
    type: 'market',
    apiModel: 'kling/v2-5-turbo-text-to-video-pro',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      return input;
    },
  },
  'kling/v2-5-turbo-image-to-video': {
    name: 'Kling V2.5 Turbo Pro I2V',
    description: 'Budget I2V workhorse. Fast turnaround, no audio. Best for rapid product animation and iteration.',
    capabilities: ['fast', 'image-to-video'],
    research: { verdict: 'I2V counterpart to V2.5 Turbo T2V. Same speed/cost advantages, strong image fidelity, no audio. Best budget option for animating reference images without audio needs. Use for rapid iteration on product animations and concept testing.', bestFor: ['rapid product photo animation at scale', 'I2V concept iteration', 'budget character animation'], weaknesses: ['no native audio', 'motion slightly flatter than V2.1 Master'], promptTechniques: ['describe motion and environment, not visual content'], communityInsights: ['go-to budget I2V model', 'upgrade to 2.6 I2V only if you need audio'], costEfficiency: '8 cr/s — 20% cheaper than 2.6 I2V and 75% cheaper than V2.1 Master I2V.', comparedTo: { 'kling/image-to-video': '2.6 I2V adds audio for 25% more.', 'kling/v2-1-pro': 'V2.1 Pro has first/last frame conditioning at 10 cr/s.' }, lastResearched: '2026-04-19', sources: ['https://curiousrefuge.com/blog/kling-25-turbo-ai-video-generator-review'] },
    type: 'market',
    apiModel: 'kling/v2-5-turbo-image-to-video-pro',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      return input;
    },
  },
  'kling/v2-1-master-text-to-video': {
    name: 'Kling V2.1 Master T2V',
    description: 'LEGACY — largely obsolete. 32 cr/s but Kling 3.0 is better at 12 cr/s. Only for niche motion richness needs.',
    capabilities: ['cinematic'],
    research: { verdict: 'Former premium flagship, now largely obsolete. At 32 cr/s, costs 2.67x more than the superior Kling 3.0. Its one strength: advanced 3D spatiotemporal attention for hyper-realistic motion dynamics. But 3.0 has closed most of this gap while adding multi-shot, audio, and 4K. AVOID for almost all use cases.', bestFor: ['niche cinematic work needing maximum motion richness'], weaknesses: ['2.67x cost of the superior Kling 3.0', 'no audio, no multi-shot, no 4K', 'max 10s'], communityInsights: ['community consensus: use 3.0 instead'], costEfficiency: 'Poor. 32 cr/s — most expensive Kling by far. 3.0 is objectively better at 63% less cost.', comparedTo: { 'kling-3/video': '3.0 is better AND 63% cheaper.' }, lastResearched: '2026-04-19', sources: ['https://videoweb.ai/blog/detail/Exploring-Kling-AI-A-Deep-Dive-into-Kling-2-1-Standard-and-Kling-2-1-Master-12f6c7c5cb3c/'] },
    type: 'market',
    apiModel: 'kling/v2-1-master-text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      return input;
    },
  },
  'kling/v2-1-master-image-to-video': {
    name: 'Kling V2.1 Master I2V',
    description: 'LEGACY — overpriced at 32 cr/s. Kling 2.6 I2V at 10 cr/s has 90% of the quality with native audio.',
    capabilities: ['cinematic', 'image-to-video'],
    research: { verdict: 'I2V counterpart to V2.1 Master T2V. At 32 cr/s it costs 3.2x more than 2.6 I2V. Advanced motion dynamics but 2.6 I2V has closed 90% of the gap while adding native audio. Recommend only for confirmed niche needs.', bestFor: ['maximum-fidelity character animation from reference images'], weaknesses: ['32 cr/s is 3.2x more than 2.6 I2V with audio', 'no audio, no multi-shot, no 4K'], costEfficiency: 'Very poor. 2.6 I2V at 10 cr/s has 90% of the quality with native audio.', comparedTo: { 'kling/image-to-video': '2.6 I2V is 69% cheaper with native audio.' }, lastResearched: '2026-04-19', sources: ['https://kie.ai/kling/v2-1'] },
    type: 'market',
    apiModel: 'kling/v2-1-master-image-to-video',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      return input;
    },
  },
  'kling/v2-1-pro': {
    name: 'Kling V2.1 Pro I2V',
    description: 'Unique niche: first/last frame conditioning for seamless loops and transitions. 10 cr/s. I2V only.',
    capabilities: ['cinematic', 'image-to-video', 'looping'],
    research: { verdict: 'Sensible middle ground in V2.1 family. Unique feature: first-frame AND last-frame conditioning for precise transitions and seamless loops. At 10 cr/s, occupies an interesting niche: use when you need looping video, controlled transitions, or defined start/end frames.', bestFor: ['seamless looping videos (product turntables, digital signage)', 'transition-controlled sequences', 'marketing with specific opening/closing compositions'], weaknesses: ['no audio', 'I2V only', 'no multi-shot', 'V2.1 tier motion quality'], promptTechniques: ['leverage first/last frame conditioning for loops', 'define camera movement that returns to starting position', 'describe transition arcs between start and end states'], communityInsights: ['first/last frame conditioning is genuinely unique in Kling lineup', 'popular for e-commerce product turntables and ambient videos'], costEfficiency: '10 cr/s — same as 2.6 I2V. Choose 2.6 for audio, V2.1 Pro for loop control.', comparedTo: { 'kling/image-to-video': 'Same price. 2.6 has audio; V2.1 Pro has frame conditioning.' }, lastResearched: '2026-04-19', sources: ['https://kie.ai/kling/v2-1'] },
    type: 'market',
    apiModel: 'kling/v2-1-pro',
    requiresImage: true,
    options: {
      duration: { type: 'string', enum: ['5', '10'], default: '5' },
      negative_prompt: { type: 'string' },
      cfg_scale: { type: 'number', min: 0, max: 1, default: 0.5 },
      tail_image_url: { type: 'string', description: 'End frame image URL' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_url: imageUrls?.[0], duration: opts.duration || '5' };
      if (opts.negative_prompt) input.negative_prompt = opts.negative_prompt;
      if (opts.cfg_scale !== undefined) input.cfg_scale = opts.cfg_scale;
      if (opts.tail_image_url) input.tail_image_url = opts.tail_image_url;
      return input;
    },
  },
  'kling/ai-avatar-standard': {
    name: 'Kling AI Avatar Standard',
    description: 'Budget talking avatar at 5 cr/s. Lip sync 4/5 quality. Up to 5 min at 1080p. Supports non-human characters.',
    capabilities: ['talking-head', 'lip-sync', 'avatar'],
    research: { verdict: 'Audio-driven talking avatar at budget tier. Takes reference image + audio file, generates lip-synced video up to 5 continuous minutes at 1080p. Lip sync quality 4/5 — good but not best-in-class. Unique advantage: supports humans, animals, cartoons, and stylized characters without manual rigging. At 5 cr/s (~/bin/zsh.056/s), extremely competitive for volume work.', bestFor: ['high-volume talking head content', 'educational video narration', 'non-human character animation (animals, cartoons, mascots)', 'podcast visualization'], weaknesses: ['lip sync inconsistent on complex speech', 'less expressive than Pro tier', 'occasional uncanny valley in eye movement'], promptTechniques: ['use motion prompts for gestures: "subtle hand gestures"', 'specify shot framing', 'use clean audio with minimal background noise', 'do NOT over-describe facial expressions — audio drives those'], communityInsights: ['great for non-human character animation — unique strength vs HeyGen', '5-minute continuous generation is impressive and unique', 'v2 major upgrade: better eye movements, blinks, natural head positioning', 'works well with beards and glasses'], costEfficiency: '5 cr/s — cheapest avatar solution. HeyGen better quality but more expensive and limited to humans.', comparedTo: { 'kling/ai-avatar-pro': 'Pro is 2x cost with better emotional range — upgrade for client-facing content.', 'seedance-2/text-to-video': 'Seedance 2 has better lip sync accuracy but much more expensive and no avatar workflow.' }, lastResearched: '2026-04-19', sources: ['https://higgsfield.ai/blog/Meet-KlingAI-Avatar-2.0-AI-Talking-Avatars', 'https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/standard'] },
    type: 'market',
    apiModel: 'kling/ai-avatar-standard',
    requiresImage: true,
    options: {
      audio_url: { type: 'string', description: 'Audio URL for lip sync' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], audio_url: opts.audio_url };
    },
  },
  'kling/ai-avatar-pro': {
    name: 'Kling AI Avatar Pro',
    description: 'Production-grade avatar at 10 cr/s. Better emotional range, tighter lip sync. Up to 5 min at 1080p 48fps.',
    capabilities: ['talking-head', 'lip-sync', 'avatar'],
    research: { verdict: 'Production-grade avatar tier. 2x cost of Standard with noticeably more expressive facial performance. Emotional nuances in audio translate more directly to character expressions. Tighter lip sync, handles complex speech patterns better. Still supports all character types (humans, animals, cartoons) at 1080p 48fps up to 5 min. The upgrade for anything where emotional authenticity matters.', bestFor: ['production-grade talking avatars', 'marketing with character presenters', 'educational content needing emotional engagement', 'character-driven narratives', 'broadcast-quality avatar content'], weaknesses: ['not best-in-class for pure lip sync (Seedance 2 is better)', 'HeyGen Avatar IV better for corporate talking heads', '2x cost of Standard'], promptTechniques: ['leverage enhanced expressiveness with emotionally varied audio', 'describe camera movements for dynamic presentations', 'use professional audio recording for maximum quality'], communityInsights: ['emotional range upgrade from Standard to Pro is genuinely noticeable', 'popular among content creators for consistent character branding', 'non-human character support makes this unique in avatar space'], costEfficiency: '10 cr/s — 2x Standard but meaningfully better emotional expression. Worth it for any content where avatar needs to feel present.', comparedTo: { 'kling/ai-avatar-standard': 'Pro has better emotional range and lip sync. Standard is 50% cheaper for volume work.' }, lastResearched: '2026-04-19', sources: ['https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/pro', 'https://higgsfield.ai/blog/Meet-KlingAI-Avatar-2.0-AI-Talking-Avatars'] },
    type: 'market',
    apiModel: 'kling/ai-avatar-pro',
    requiresImage: true,
    options: {
      audio_url: { type: 'string', description: 'Audio URL for lip sync' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], audio_url: opts.audio_url };
    },
  },

  // ── Grok Imagine Extend ──
  'grok-imagine/extend': {
    name: 'Grok Imagine Video Extend',
    description: 'Extend existing Grok videos by 6-10 seconds',
    capabilities: ['animation'],
    type: 'market',
    apiModel: 'grok-imagine/extend',
    options: {
      task_id: { type: 'string', description: 'Task ID from a previous video generation' },
      extend_times: { type: 'number', enum: [6, 10], default: 6, description: 'Extension duration in seconds' },
      extend_at: { type: 'string', description: 'Where to extend (optional)' },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      return { prompt, task_id: opts.task_id, extend_times: opts.extend_times || 6, ...(opts.extend_at ? { extend_at: opts.extend_at } : {}) };
    },
  },

  // ── Infinitalk (audio-to-video) ──
  'infinitalk/from-audio': {
    name: 'Infinitalk Audio-to-Video',
    description: 'Audio-driven talking head video generation',
    capabilities: ['talking-head', 'lip-sync'],
    type: 'market',
    apiModel: 'infinitalk/from-audio',
    requiresImage: true,
    options: {
      audio_url: { type: 'string', description: 'Audio URL to drive talking head' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '480p' },
      seed: { type: 'number', min: 10000, max: 1000000 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], audio_url: opts.audio_url, resolution: opts.resolution || '480p', ...(opts.seed !== undefined ? { seed: opts.seed } : {}) };
    },
  },

  // ── HappyHorse 1.0 (NEW April 8, 2026 — appeared on Artificial Analysis as #1 in T2V/I2V) ──
  'happyhorse/text-to-video': {
    name: 'HappyHorse 1.0 T2V',
    description: 'Alibaba flagship — #1 on Artificial Analysis Arena T2V (Elo 1389, +118 over Seedance 2.0). 15B params, open-source, by Zhang Di (former Kling architect).',
    capabilities: ['cinematic', 'animation', 'audio', 'latest', 'new', 'open-source', 'alibaba'],
    research: { verdict: 'Alibaba ATH/Taotian Future Life Lab\'s flagship. Led by Zhang Di — former Kling architect at Kuaishou who rejoined Alibaba late 2025 and shipped this within months. Hit #1 on Artificial Analysis Arena April 7, 2026 with T2V Elo 1389 (vs Seedance 2.0 at 1271 — leading by ~118 points, ~58% blind-test win rate). Open-source 15B params. The key trade-off: HappyHorse wins on visual quality and motion; Seedance 2.0 wins on audio-enabled generation (1219 vs 1205 ELO). Strong at cinematic camera moves and physical specificity. Weak at text rendering (42/100) and complex hand articulation (68% close-up accuracy).', bestFor: ['cinematic single-shot generation where visual quality matters most', 'camera-centric shots (dolly, orbit, push-in, crash zoom)', 'physically specific subjects with clear actions', 'open-source workflows requiring weights access', '5-second narrative beats with stable camera'], weaknesses: ['text rendering 42/100 — useless for posters, signs, UI', 'hand articulation 68% in close-ups (87% full body)', 'performance degrades 12% at extreme aspect ratios (21:9, 9:16)', 'quality collapses after ~5s in some reports — turns cartoonish', 'compressed latent colorspace limits post-production grading', 'pseudo-deterministic — iterative refinement unreliable', 'audio quality narrowly behind Seedance 2.0', 'no multimodal reference inputs (no audio/video refs like Seedance 2.0)'], promptTechniques: ['~20 word sweet spot — Subject + Action + Setting + 1 camera cue', 'physical specificity wins: "tall man in his 40s with grey beard, worn leather jacket" not "a man"', 'use precise visible movement, not emotional states', 'place camera cues at END of prompt — gets most weight', 'use filmmaking terms: dolly push, whip-pan, crash zoom, snap focus', 'better detail, not more detail — every word competes for attention', 'if it can\'t be photographed, don\'t write it', 'create permanent character profiles for cross-scene consistency'], communityInsights: ['Alibaba revealed as creator April 10, 2026 (CNBC)', 'corroborated across multiple sources: leads Seedance on visual quality, loses to Seedance on audio', 'fal.ai launched as official API partner April 26 — model is real and accessible', 'open-source weights drop expected — community deployment guides already published', 'multiple independent reviews (Atlas Cloud, Pollo AI, fal.ai, Apiyi) confirm benchmark numbers', 'first model to combine open-source + native joint audio-video generation'], costEfficiency: 'Pricing not yet officially disclosed by kie.ai. Open-source nature means cost will likely be competitive (8 cr/s estimate). For pure visual quality at 1080p, currently the best ELO/dollar in the market.', comparedTo: { 'seedance-2/text-to-video': 'HappyHorse +118 ELO on visual T2V; Seedance +14 ELO on audio T2V. HappyHorse for visual quality, Seedance for synced audio and multimodal references (9 imgs + 3 vids + 3 audio).', 'veo-3/text-to-video': 'Veo retains 4K-only path and superior cinematic color grading. HappyHorse beats Veo on raw ELO at 1080p but lacks Veo\'s post-production flexibility.', 'kling-3/video': 'Kling 3.0 has multi-shot capability HappyHorse lacks. HappyHorse wins single-shot quality. Note: same architect (Zhang Di) built both.', 'wan/2-7-text-to-video': 'Wan 2.7 has video editing and reference-to-video features HappyHorse 1.0 lacks. HappyHorse wins ELO; Wan wins workflow flexibility.' }, lastResearched: '2026-05-05', sources: ['https://www.cnbc.com/2026/04/10/alibaba-happyhorse-ai-video-model-benchmark-reveal.html', 'https://artificialanalysis.ai/video/leaderboard/text-to-video', 'https://help.apiyi.com/en/happy-horse-1-vs-seedance-2-video-ai-comparison-en.html', 'https://fal.ai/happyhorse-1.0', 'https://wavespeed.ai/blog/posts/what-is-happyhorse-1-0-ai-video-model/', 'https://www.glbgpt.com/resources/happy-horse-1-0-prompt-guide/'] },
    type: 'market',
    apiModel: 'happyhorse/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15)' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio || '16:9', duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'happyhorse/image-to-video': {
    name: 'HappyHorse 1.0 I2V',
    description: 'Alibaba HappyHorse I2V — #1 on Arena I2V (Elo 1416, +65 over Seedance). Best ELO image-to-video model.',
    capabilities: ['cinematic', 'animation', 'image-to-video', 'audio', 'latest', 'new', 'open-source', 'alibaba'],
    research: { verdict: 'I2V counterpart leads Arena leaderboard with Elo 1416 vs Seedance 2.0 at 1351 — ~65 ELO advantage. Same Alibaba/Zhang Di provenance as T2V. The image anchoring helps mitigate HappyHorse\'s text-rendering and hand-articulation weaknesses by giving the model a fixed visual reference. Strongest single-image-to-video quality available currently for cinematic content. Same audio-quality gap behind Seedance 2.0.', bestFor: ['animating product photography with cinematic motion', 'hero image animation for ads and brand content', 'animating concept art and illustrations', 'character animation from a clean reference photo', 'physical product demos with subtle camera movement'], weaknesses: ['no multi-reference support (single image only)', 'inherits T2V color grading constraints', 'rapid action from static images shows motion blur after ~4 m/s', 'audio narrowly behind Seedance 2.0', 'cannot maintain identity across longer cuts without explicit prompting'], promptTechniques: ['describe MOTION not visual content (image provides that)', '~20 word target as with T2V', 'specify camera movement explicitly: "slow dolly-in", "orbit clockwise 30 degrees"', 'state what should NOT move', 'for products: describe environmental light changes', 'high-resolution sharp source images give dramatically better results'], communityInsights: ['I2V leads T2V in arena ranking — image anchoring helps overall quality', 'same prompting principles as T2V: physical specificity, camera language at end', 'fal.ai/kie.ai both offer it — open-source means more providers coming'], costEfficiency: 'Same 8 cr/s estimate. Best ELO/dollar I2V available at 1080p.', comparedTo: { 'seedance-2/text-to-video': 'HappyHorse +65 ELO on I2V. Seedance has multi-reference (9 images, 3 videos, 3 audio) for richer compositional control. HappyHorse for pure quality, Seedance for production complexity.', 'veo-3/image-to-video': 'Veo offers 4K and 3-image "Ingredients" system. HappyHorse has higher 1080p ELO but no equivalent multi-ref system.', 'kling/image-to-video': 'Kling has native audio at 2.6+. HappyHorse has higher visual ELO but Kling has the workflow ecosystem.' }, lastResearched: '2026-05-05', sources: ['https://artificialanalysis.ai/video/leaderboard/image-to-video', 'https://help.apiyi.com/en/happy-horse-1-vs-seedance-2-video-ai-comparison-en.html', 'https://fal.ai/happyhorse-1.0'] },
    type: 'market',
    apiModel: 'happyhorse/image-to-video',
    requiresImage: true,
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5 },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_urls: imageUrls, duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'happyhorse/reference-to-video': {
    name: 'HappyHorse 1.0 R2V',
    description: 'HappyHorse R2V — 1-9 reference images for character and style consistency. Closest direct competitor to Seedance 2.0 multi-ref.',
    capabilities: ['cinematic', 'animation', 'character', 'multi-reference', 'latest', 'new', 'open-source'],
    research: { verdict: 'HappyHorse\'s answer to Seedance 2.0\'s multimodal control. Accepts 1-9 reference images for character, style, and composition consistency. Note: still images only — Seedance 2.0 also accepts video and audio references which HappyHorse R2V does not. For pure visual character consistency at 1080p, HappyHorse leads. For full multimodal direction (video motion refs, audio sync refs), Seedance 2.0 still wins.', bestFor: ['character-consistent series with multiple reference angles', 'product placement with style + composition refs', 'art style transfer with multiple visual references', 'cinematic mood pieces using 5-9 reference moodboard images'], weaknesses: ['only image references — no video or audio refs', 'inherits same text rendering and hand limitations', 'no documented limit on quality at 9 refs vs 3 refs — likely diminishing returns'], promptTechniques: ['describe relationships between references explicitly', 'provide reference images at consistent lighting/style for best results', 'use 3-5 references as sweet spot before diminishing returns', 'reference camera angles, character profiles, and style anchors separately'], communityInsights: ['unverified community report: 9-image limit produces noticeable returns up to ~5 refs then plateaus', 'use case overlap with Wan 2.7 R2V — HappyHorse wins ELO, Wan has broader workflow'], costEfficiency: '8 cr/s estimate. Cheaper alternative to Seedance 2.0 for image-only multi-ref work.', comparedTo: { 'seedance-2/text-to-video': 'Seedance accepts 9 images + 3 videos + 3 audio refs. HappyHorse R2V accepts only 9 images. For pure image-ref work HappyHorse wins ELO; for full multimodal Seedance is the only option.', 'wan/2-7-reference-to-video': 'Both target same use case. HappyHorse wins ELO; Wan has broader Wan 2.7 ecosystem (T2V/I2V/edit/r2v all in one family).' }, lastResearched: '2026-05-05', sources: ['https://fal.ai/happyhorse-1.0', 'https://artificialanalysis.ai/video/leaderboard/text-to-video'] },
    type: 'market',
    apiModel: 'happyhorse/reference-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5 },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, reference_image: imageUrls, aspect_ratio: aspectRatio || '16:9', duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'happyhorse/video-edit': {
    name: 'HappyHorse 1.0 Video Edit',
    description: 'HappyHorse video editing — text prompts + 0-5 ref images, audio auto/origin modes. Direct competitor to Wan 2.7 Video Edit.',
    capabilities: ['editing', 'video-to-video', 'latest', 'new', 'open-source'],
    research: { verdict: 'HappyHorse video editing variant. Inherits the strong visual quality from T2V/I2V but applied to existing video as input. Supports up to 5 reference images for guided edits. Audio handling has two modes: auto (regenerate) or origin (preserve source audio). Less mature than Wan 2.7 Video Edit which has been refined longer, but HappyHorse\'s underlying visual ELO advantage suggests stronger editing quality once stable.', bestFor: ['style transfer on existing videos', 'product video relighting and grading', 'video upscaling with style adjustments', 'subject swaps with reference image guidance'], weaknesses: ['newer than Wan 2.7 Video Edit — fewer documented edge cases', 'audio_setting auto mode may regenerate audio you wanted to preserve', 'cannot do surgical pixel-perfect edits like Flux Kontext (it\'s video, different category)'], promptTechniques: ['use audio_setting: "origin" to keep source audio', 'use audio_setting: "auto" to regenerate audio matching new visual', 'reference images guide style; describe target outcome explicitly', 'simpler edits work better — multi-element edits compound errors'], communityInsights: ['fewer independent reviews than T2V/I2V — quality less verified', 'unverified community report: works best on 1080p source videos'], costEfficiency: '10 cr/s estimate (slightly higher than T2V due to editing complexity). Competitive with Wan 2.7 Video Edit.', comparedTo: { 'wan/2-7-video-edit': 'Wan 2.7 Video Edit is more mature and battle-tested. HappyHorse Video Edit has higher visual ELO advantage but fewer documented workflows.', 'runway/aleph-edit': 'Runway Aleph specializes in editing. HappyHorse is generalist — Runway better for specialized editing tasks.' }, lastResearched: '2026-05-05', sources: ['https://fal.ai/happyhorse-1.0', 'https://kie.ai/happyhorse-1-0'] },
    type: 'market',
    apiModel: 'happyhorse/video-edit',
    options: {
      video_url: { type: 'string', description: 'Input video URL to edit' },
      reference_image: { type: 'array', description: 'Optional 0-5 reference images for guidance' },
      audio_setting: { type: 'string', enum: ['auto', 'origin'], default: 'auto' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      const input = { prompt, video_url: opts.video_url, audio_setting: opts.audio_setting || 'auto', resolution: opts.resolution || '1080p' };
      if (opts.reference_image) input.reference_image = opts.reference_image;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },

  // ── Gemini Omni (NEW May 19, 2026 — Google's "anything from anything" multimodal video) ──
  'gemini-omni/video': {
    name: 'Gemini Omni Video (Google)',
    description: 'NEW — Google\'s "anything from anything" model. Text + up to 7 images + 3 audio + 1 video + 3 character IDs → coherent video up to 4K (must opt into 1080p/4k; default is 720p).',
    capabilities: ['cinematic', 'animation', 'audio', 'character', 'multi-reference', 'latest', 'new', 'multimodal', '4k'],
    type: 'market',
    apiModel: 'gemini-omni-video',
    aspectRatios: ['16:9', '9:16'],
    maxPromptChars: 20000,
    // Reference asset quota per request: images + videos*2 + character_ids ≤ 7 (per kie.ai docs).
    options: {
      duration: { type: 'string', enum: ['4', '6', '8', '10'], default: '8', description: 'Duration in seconds' },
      resolution: { type: 'string', enum: ['720p', '1080p', '4k'], default: '720p' },
      audio_ids: { type: 'array', items: { type: 'string' }, description: 'Up to 3 voice IDs from create_omni_voice' },
      character_ids: { type: 'array', items: { type: 'string' }, description: 'Up to 3 character IDs from create_omni_character' },
      video_list: { type: 'array', items: { type: 'object' }, description: 'Max 1 reference video object {url, start, ends?} (≤100MB, ≤30s, trim range must differ ≤10s)' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = {
        prompt,
        aspect_ratio: aspectRatio || '16:9',
        duration: String(opts.duration || '8'),
        resolution: opts.resolution || '720p',
      };
      // Cap arrays to documented limits; reject obviously-wrong types early.
      const images = Array.isArray(imageUrls) ? imageUrls.slice(0, 7) : [];
      const audioIds = Array.isArray(opts.audio_ids) ? opts.audio_ids.slice(0, 3) : [];
      const characterIds = Array.isArray(opts.character_ids) ? opts.character_ids.slice(0, 3) : [];
      const videoList = Array.isArray(opts.video_list) ? opts.video_list.slice(0, 1) : [];
      // Reference asset quota (images + videos*2 + character_ids ≤ 7) per kie.ai docs.
      const quota = images.length + videoList.length * 2 + characterIds.length;
      if (quota > 7) {
        throw new Error(`gemini-omni/video reference quota exceeded: images(${images.length}) + videos×2(${videoList.length * 2}) + character_ids(${characterIds.length}) = ${quota}, must be ≤ 7`);
      }
      if (images.length) input.image_urls = images;
      if (audioIds.length) input.audio_ids = audioIds;
      if (characterIds.length) input.character_ids = characterIds;
      if (videoList.length) input.video_list = videoList;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
};

// ─── Audio Tools Registry (metadata for list_models, not for request building) ───
const AUDIO_TOOLS_REGISTRY = {
  'generate_music': { name: 'Suno Music Generation', pricingKey: 'suno-music', category: 'music', description: 'Generate full tracks with Suno V3.5-V5.5, instrumental or with vocals', capabilities: ['music-generation'] },
  'extend_music': { name: 'Suno Extend Music', pricingKey: 'suno/extend-music', category: 'music', description: 'Continue/extend an existing Suno track from a specific point', capabilities: ['music-generation', 'music-editing'] },
  'cover_audio': { name: 'Suno Audio Cover', pricingKey: 'suno/cover-audio', category: 'music', description: 'Create AI covers from uploaded audio with custom vocals and style', capabilities: ['music-generation', 'style-transfer'] },
  'add_instrumental': { name: 'Suno Add Instrumental', pricingKey: 'suno/add-instrumental', category: 'music', description: 'Add instrumental backing to uploaded vocal audio', capabilities: ['music-generation'] },
  'add_vocals': { name: 'Suno Add Vocals', pricingKey: 'suno/add-vocals', category: 'music', description: 'Add AI vocals to uploaded instrumental audio', capabilities: ['music-generation'] },
  'replace_section': { name: 'Suno Replace Section', pricingKey: 'suno/replace-section', category: 'music', description: 'Replace a time range in a Suno track with new content', capabilities: ['music-editing'] },
  'generate_lyrics': { name: 'Suno Lyrics Generator', pricingKey: 'suno/generate-lyrics', category: 'music', description: 'Generate song lyrics from a prompt (max 200 chars)', capabilities: ['lyrics'] },
  'generate_sounds': { name: 'Suno Sound Generator', pricingKey: 'suno/generate-sounds', category: 'sfx', description: 'Generate loopable sounds with BPM, key, and loop control', capabilities: ['sfx-generation'] },
  'convert_to_wav': { name: 'Suno Convert to WAV', pricingKey: 'suno/convert-to-wav', category: 'utility', description: 'Convert a Suno track to lossless WAV format', capabilities: ['audio-processing'] },
  'separate_vocals': { name: 'Suno Vocal Separation', pricingKey: 'suno/separate-vocals', category: 'utility', description: 'Separate vocals from instrumentals or split into stems', capabilities: ['audio-processing'] },
  'generate_midi': { name: 'Suno MIDI Export', pricingKey: 'suno/generate-midi', category: 'utility', description: 'Export a Suno track to MIDI notation', capabilities: ['audio-processing'] },
  'create_music_video': { name: 'Suno Music Video', pricingKey: 'suno/create-music-video', category: 'video', description: 'Generate an MP4 music video visualization from a Suno track', capabilities: ['music-generation', 'video'] },
  'generate_sfx': { name: 'Sound Effects (Suno V5)', pricingKey: 'suno/generate-sounds', category: 'sfx', description: 'Generate sound effects from text (routes via Suno V5 — kie.ai removed the ElevenLabs SFX model)', capabilities: ['sfx-generation'] },
  'generate_tts': { name: 'ElevenLabs Text-to-Speech', pricingKey: 'elevenlabs/text-to-speech-turbo-2-5', category: 'speech', description: 'Synthesize speech — Turbo 2.5 (fast) or Multilingual V2 (quality)', capabilities: ['text-to-speech'] },
  'generate_dialogue': { name: 'ElevenLabs Text-to-Dialogue', pricingKey: 'elevenlabs/text-to-dialogue-v3', category: 'speech', description: 'Multi-speaker dialogue generation with voice assignment', capabilities: ['text-to-speech', 'dialogue'] },
  'audio_isolation': { name: 'ElevenLabs Audio Isolation', pricingKey: 'elevenlabs/audio-isolation', category: 'utility', description: 'Isolate vocals or audio from background noise', capabilities: ['audio-processing'] },
  'speech_to_text': { name: 'ElevenLabs Speech-to-Text', pricingKey: 'elevenlabs/speech-to-text', category: 'speech', description: 'Transcribe audio with optional diarization and event tagging', capabilities: ['transcription'] },
  'upload_file': { name: 'File Upload', pricingKey: 'upload-file', category: 'utility', description: 'Upload files (URL or base64) to get public URLs for generation tools. Files expire in 3 days.', capabilities: ['file-upload'] },
  'veo_extend': { name: 'Veo 3.1 Video Extend', pricingKey: 'veo/extend', category: 'video', description: 'Extend existing Veo videos with continuation content', capabilities: ['video-extend'] },
  'veo_upscale_1080p': { name: 'Veo 3.1 1080p Upscale', pricingKey: 'veo/1080p', category: 'video', description: 'Upscale Veo video output to 1080p resolution (~1-3 min)', capabilities: ['upscale'] },
  'veo_upscale_4k': { name: 'Veo 3.1 4K Upscale', pricingKey: 'veo/4k', category: 'video', description: 'Upscale Veo video output to 4K resolution (~5-10 min)', capabilities: ['upscale'] },
  'runway_extend': { name: 'Runway Video Extend', pricingKey: 'runway/extend', category: 'video', description: 'Extend Runway Aleph videos with continuation content', capabilities: ['video-extend'] },
  // ── New Suno endpoints (April-May 2026) ──
  'generate_persona': { name: 'Suno Generate Persona', pricingKey: 'suno/generate-persona', category: 'music', description: 'Create a Persona (music character) from a Suno track for reuse in future generations. Requires V3.6+ taskId.', capabilities: ['music-generation', 'character', 'latest'] },
  'generate_mashup': { name: 'Suno Generate Mashup', pricingKey: 'suno/generate-mashup', category: 'music', description: 'Mashup music from up to 2 audio tracks into one new track', capabilities: ['music-generation', 'music-editing', 'latest'] },
  'boost_style': { name: 'Suno Boost Music Style', pricingKey: 'suno/boost-style', category: 'music', description: 'Generate enhanced style descriptions from concise input (e.g. "Pop, Mysterious")', capabilities: ['music-generation', 'lyrics', 'latest'] },
  'get_timestamped_lyrics': { name: 'Suno Timestamped Lyrics', pricingKey: 'suno/timestamped-lyrics', category: 'music', description: 'Get word-level timestamped lyrics from a Suno track for karaoke/captioning', capabilities: ['lyrics', 'audio-processing', 'latest'] },
  'generate_cover_art': { name: 'Suno Cover Art', pricingKey: 'suno/cover-art', category: 'music', description: 'Generate album cover art for an existing Suno music track', capabilities: ['music-generation', 'cover-art'] },
  'upload_extend_audio': { name: 'Suno Upload & Extend Audio', pricingKey: 'suno/upload-extend', category: 'music', description: 'Extend an uploaded audio file (not a Suno track) with new AI-generated content', capabilities: ['music-generation', 'music-editing'] },
  // ── Gemini Omni character creation (May 2026) ──
  'create_omni_voice': { name: 'Gemini Omni Voice Creator', pricingKey: 'gemini-omni/voice-create', category: 'character', description: 'Create a reusable voice ID for Gemini Omni video. Returns kieAudioId for use in audio_ids array.', capabilities: ['character', 'voice', 'video', 'latest', 'new'] },
  'create_omni_character': { name: 'Gemini Omni Character Creator', pricingKey: 'gemini-omni/character-create', category: 'character', description: 'Create a reusable visual character ID for Gemini Omni video. Returns characterId from image + optional voice.', capabilities: ['character', 'multimodal', 'video', 'latest', 'new'] },
};

// ─── Helpers ───

const taskHistory = [];

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

async function kieRequest(method, path, body) {
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
  if (res.status !== 200) {
    throw new Error(`kie.ai API HTTP error ${res.status}: ${JSON.stringify(json)}`);
  }
  if (json.code && json.code !== 200) {
    throw new Error(`kie.ai API error code ${json.code}: ${json.msg || JSON.stringify(json)}`);
  }
  return json;
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
    throw err;
  }
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
            throw new Error(`Task failed (flag=${data.successFlag}): ${data.errorMessage || data.failMsg || 'Unknown'}`);
          }
        }
        // state-based models: Runway (same format as market models)
        else if (data.state) {
          if (data.state === 'success') return data;
          if (data.state === 'fail') throw new Error(`Task failed: ${data.failMsg || 'Unknown'} (code: ${data.failCode})`);
        }
      }
    } else {
      // Market models use the generic recordInfo endpoint
      const result = await pollOnce('GET', `/api/v1/jobs/recordInfo?taskId=${taskId}`);
      if (result) {
        const data = result.data || result;
        if (data.state === 'success') return data;
        if (data.state === 'fail') throw new Error(`Task failed: ${data.failMsg || 'Unknown'} (code: ${data.failCode})`);
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

// Shared Suno polling — all Suno endpoints use the same poll pattern
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
        throw new Error(`Suno task failed: ${d.errorMessage || d.status}`);
      if (d.status === 'SENSITIVE_WORD_ERROR') throw new Error('Content filtered by Suno.');
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`Suno task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

// Helper to download Suno tracks from sunoData array
async function downloadSunoTracks(sunoData, outFilename, ext = 'mp3') {
  const downloadedFiles = [];
  for (let i = 0; i < sunoData.length; i++) {
    const track = sunoData[i];
    const url = track.audioUrl || track.videoUrl || track.midiUrl || track.wavUrl;
    if (!url) continue;
    const trackName = outFilename.replace(new RegExp(`\\.${ext}$`), i === 0 ? `.${ext}` : `-${i + 1}.${ext}`);
    const trackPath = join(RAW_DIR, trackName);
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
  if (urls.length === 0 && result.url) urls = [result.url];
  // Deduplicate
  return [...new Set(urls)];
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

const SERVER_INFO = { name: 'kie-art', version: '4.0.6' };
const SERVER_CAPS = { capabilities: { tools: {} } };

// Handler functions — extracted so they can be registered on multiple server instances (HTTP sessions)
const handleListTools = async () => ({
  tools: [
    {
      name: 'generate_image',
      description: `Generate an image using kie.ai (45+ models). Downloads to kie/assets/raw/. MODEL GUIDE: Architecture/blueprints→gpt4o or nano-banana-2 (reasoning). Game art/3D→seedream/4.5 or 5-lite. Character sheets→ideogram/character. Text/logos→ideogram/v3 (best text). Photo editing→flux-kontext-pro. Anime→qwen (3cr cheapest). Upscale→recraft/crisp-upscale (2cr). BG removal→recraft/remove-background. Cheapest→z-image,qwen (3cr). Best quality→nano-banana-pro (24cr), flux-kontext-max (100cr). Use list_models filter="use-case" to explore.`,
      inputSchema: {
        type: 'object',
        properties: {
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
      description: `Generate a video using kie.ai (66+ models). Downloads to kie/assets/raw/. MODEL GUIDE: Best cinematic→veo-3/text-to-video (50cr/s, audio). Fast+cheap→wan/flash-image-to-video (2cr/s), wan/turbo (2cr/s). Budget cinematic→hailuo-standard (4cr/s) Image-to-video→veo-3/image-to-video, kling/image-to-video, wan/image-to-video. Lip sync/talking head→kling/ai-avatar-pro, infinitalk/from-audio. Motion control→kling/motion-control, wan/animate-move. Multi-scene→kling-3/video (multi-shot) Extend video→use veo_extend or runway_extend tools. Upscale→veo_upscale_1080p, veo_upscale_4k. Use list_models filter="use-case" to explore.`,
      inputSchema: {
        type: 'object',
        properties: {
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
        },
        required: ['text'],
      },
    },
    {
      name: 'generate_tts',
      description: `Generate speech from text using ElevenLabs via kie.ai. Supports Turbo 2.5 (fast) and Multilingual V2 (high quality). Downloads to kie/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
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
            description: 'Voice stability (0, 0.5, or 1.0)',
          },
          language_code: { type: 'string', description: 'Language code (e.g. "en")' },
          filename: { type: 'string', description: 'Output filename. Auto-generated if omitted.' },
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
          audioId: { type: 'string', description: 'Audio ID from a previous Suno generation (from sunoData)' },
          prompt: { type: 'string', description: 'Prompt for the extension' },
          style: { type: 'string', description: 'Style tags for the extension' },
          title: { type: 'string' },
          continueAt: { type: 'number', description: 'Timestamp in seconds to continue from' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          defaultParamFlag: { type: 'boolean', default: false, description: 'Use default params from original track' },
          filename: { type: 'string' },
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
          uploadUrl: { type: 'string', description: 'URL of vocal audio' },
          title: { type: 'string' },
          tags: { type: 'string', description: 'Style tags for the instrumental' },
          negativeTags: { type: 'string' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
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
          prompt: { type: 'string', description: 'Lyrics or vocal description' },
          uploadUrl: { type: 'string', description: 'URL of instrumental audio' },
          title: { type: 'string' },
          style: { type: 'string' },
          negativeTags: { type: 'string' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
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
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          filename: { type: 'string' },
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
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          type: { type: 'string', enum: ['separate_vocal', 'split_stem'], default: 'separate_vocal', description: 'separate_vocal=vocals+instrumental, split_stem=individual instruments' },
          filename: { type: 'string' },
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
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData (optional)' },
          filename: { type: 'string' },
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
          taskId: { type: 'string', description: 'Task ID of the Suno generation' },
          audioId: { type: 'string', description: 'Audio ID from sunoData' },
          author: { type: 'string', description: 'Author name for video credits' },
          domainName: { type: 'string', description: 'Domain name for video branding' },
          filename: { type: 'string' },
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
          prompt: { type: 'string', description: 'Sound description (e.g. "ambient rain on a tin roof, soft thunder")' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          soundLoop: { type: 'boolean', default: false, description: 'Whether the sound should loop seamlessly' },
          soundTempo: { type: 'number', description: 'BPM for the sound' },
          soundKey: { type: 'string', description: 'Musical key (e.g. "C", "Am")' },
          grabLyrics: { type: 'boolean', default: false },
          filename: { type: 'string' },
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
          taskId: { type: 'string', description: 'Source task ID' },
          audioIds: { type: 'array', items: { type: 'string' }, description: 'Up to 2 audio IDs to mashup' },
          prompt: { type: 'string', description: 'Optional prompt for mashup direction' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          filename: { type: 'string' },
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
          uploadUrl: { type: 'string', description: 'URL of the audio file to extend' },
          prompt: { type: 'string', description: 'Description of the extension content' },
          continueAt: { type: 'number', description: 'Timestamp in seconds where to start the extension' },
          model: { type: 'string', enum: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'], default: 'V5' },
          style: { type: 'string', description: 'Style tags for the extension' },
          title: { type: 'string' },
          instrumental: { type: 'boolean', default: false },
          filename: { type: 'string' },
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
      description: 'Upload a file to kie.ai and get a public URL back. Use this to upload local images/audio/video before passing them to generation tools. Supports URL upload, base64 upload. Files expire after 3 days.',
      inputSchema: {
        type: 'object',
        properties: {
          file_url: { type: 'string', description: 'URL of file to upload (for URL method)' },
          base64_data: { type: 'string', description: 'Base64-encoded file data with MIME prefix (for base64 method)' },
          upload_path: { type: 'string', description: 'Storage directory (e.g. "images", "audio", "video")', default: 'uploads' },
          file_name: { type: 'string', description: 'Custom filename (optional)' },
        },
      },
    },
    // ── Veo Extend & Upscale ──
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
        const validationError = validateModelOptions(modelDef, { aspect_ratio, prompt }, model_options);
        if (validationError) {
          return { content: [{ type: 'text', text: `Invalid input for "${modelId}": ${validationError}` }] };
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeModelName = modelId.replace(/\//g, '-');
        const outFilename = filename || `${safeModelName}-${ts}.png`;
        const outPath = join(RAW_DIR, outFilename);

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
        taskHistory.push(taskEntry);

        // Poll until done — pass modelId so dedicated endpoints use their own polling URL
        const result = await pollTask(taskId, 600000, modelId);
        const resultUrls = extractResultUrls(result);

        if (resultUrls.length === 0) {
          taskEntry.status = 'no_urls';
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
          const path = i === 0 ? outPath : join(RAW_DIR, outFilename.replace(/\.png$/, `-${i + 1}.png`));
          await downloadToFile(resultUrls[i], path);
          downloadedFiles.push(path);
        }

        taskEntry.status = 'downloaded';
        taskEntry.resultUrls = resultUrls;

        return {
          content: [{
            type: 'text',
            text: [
              `✅ Image generated successfully!`,
              `Model: ${modelDef.name} (${modelId})`,
              `Task ID: ${taskId}`,
              `Cost time: ${result.costTime ? result.costTime / 1000 + 's' : 'N/A'}`,
              `Est. cost: ${getCostEstimate(modelId) || 'unknown'}`,
              ``,
              `Downloaded ${downloadedFiles.length} file(s):`,
              ...downloadedFiles.map((f) => `  → ${f}`),
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
        const result = await kieRequest('GET', `/api/v1/jobs/recordInfo?taskId=${args.task_id}`);
        const data = result.data || result;
        return {
          content: [{
            type: 'text',
            text: [
              `Task: ${data.taskId}`,
              `State: ${data.state}`,
              `Progress: ${data.progress || 0}%`,
              `Model: ${data.model || 'N/A'}`,
              `Cost time: ${data.costTime ? data.costTime / 1000 + 's' : 'N/A'}`,
              data.failMsg ? `Error: ${data.failMsg}` : '',
              data.resultJson ? `Result: ${JSON.stringify(data.resultJson)}` : '',
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
        const result = await kieRequest('GET', `/api/v1/jobs/recordInfo?taskId=${args.task_id}`);
        const data = result.data || result;
        if (data.state !== 'success') {
          return { content: [{ type: 'text', text: `Task is "${data.state}", not yet downloadable.` }] };
        }
        const urls = extractResultUrls(data);
        if (urls.length === 0) {
          return { content: [{ type: 'text', text: `No result URLs for task ${args.task_id}` }] };
        }
        const outName = args.filename || `download-${args.task_id.slice(0, 8)}.png`;
        const outPath = join(RAW_DIR, outName);
        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `Downloaded to: ${outPath}` }] };
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
        const validationError = validateModelOptions(modelDef, { aspect_ratio, prompt }, model_options);
        if (validationError) {
          return { content: [{ type: 'text', text: `Invalid input for "${modelId}": ${validationError}` }] };
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeModelName = modelId.replace(/\//g, '-');
        const outFilename = filename || `${safeModelName}-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);

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

        taskHistory.push({ taskId, model: modelId, prompt: prompt?.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        // Use dedicated poll endpoint if available, otherwise generic market polling
        const pollEndpoint = modelDef.pollEndpoint || null;
        const pollResult = await pollTask(taskId, 900000, pollEndpoint ? modelId : null); // 15min max for video
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Task ${taskId} done but no result URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return {
          content: [{
            type: 'text',
            text: [`✅ Video generated!`, `Model: ${modelDef.name}`, `Task ID: ${taskId}`, `Est. cost: ${getCostEstimate(modelId, parseInt(model_options.duration) || 8) || 'unknown'}`, ``, `Downloaded to: ${outPath}`].join('\n'),
          }],
        };
      }

      case 'generate_music': {
        const { prompt, model = 'V5', instrumental = true, style, title, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `music-${ts}.mp3`;

        const body = { prompt, model, customMode: false, instrumental };
        if (style) body.style = style;
        if (title) body.title = title;

        const result = await sunoCreate('/api/v1/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start music generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        taskHistory.push({ taskId, model: `suno-${model}`, prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        const pollResult = await pollSunoTask(taskId);
        const sunoData = pollResult.sunoData;
        if (!sunoData || sunoData.length === 0) return { content: [{ type: 'text', text: `Music task ${taskId} completed but no tracks returned.` }] };

        const downloadedFiles = await downloadSunoTracks(sunoData, outFilename);

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
        const outFilename = filename || `sfx-${ts}.mp3`;

        // Suno has no duration parameter — fold the target length into the prompt
        const prompt = duration_seconds !== undefined
          ? `${text}, about ${Math.max(0.5, duration_seconds)} seconds long`
          : text;

        const result = await sunoCreate('/api/v1/generate/sounds', { prompt, model: 'V5' });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start SFX generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        taskHistory.push({ taskId, model: 'suno/sounds', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `SFX task ${taskId} done but no results.` }] };

        const files = await downloadSunoTracks(sunoData, outFilename);
        return { content: [{ type: 'text', text: `✅ SFX generated (via Suno V5)!\nText: "${text}"\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'generate_tts': {
        const { text, voice_id, model: ttsModel = 'turbo-2-5', speed, language_code, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `tts-${ts}.mp3`;
        const outPath = join(RAW_DIR, outFilename);

        const apiModel = ttsModel === 'multilingual-v2' ? 'elevenlabs/text-to-speech-multilingual-v2' : 'elevenlabs/text-to-speech-turbo-2-5';
        // kie.ai requires a voice (422 "voiceId cannot be empty" without one) despite docs claiming a server-side default
        const input = { text, voice: resolveVoice(voice_id), output_format: 'mp3_44100_128' };
        if (speed !== undefined && ttsModel === 'multilingual-v2') input.speed = speed;
        if (language_code && ttsModel === 'multilingual-v2') input.language_code = language_code;

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: apiModel, input });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start TTS generation — no taskId returned.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        const pollResult = await pollTask(taskId, 60000);
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `TTS task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ TTS generated!\nModel: ${apiModel}\nText: "${text.slice(0, 80)}"\nDownloaded to: ${outPath}` }] };
      }

      case 'generate_dialogue': {
        const { dialogue, stability, language_code, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `dialogue-${ts}.mp3`;
        const outPath = join(RAW_DIR, outFilename);

        const input = { dialogue: dialogue.map((line) => ({ ...line, voice: resolveVoice(line.voice) })) };
        if (stability !== undefined) input.stability = stability;
        if (language_code) input.language_code = language_code;

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'elevenlabs/text-to-dialogue-v3', input });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start dialogue generation.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        const pollResult = await pollTask(taskId, 120000);
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `Dialogue task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Dialogue generated!\nSpeakers: ${dialogue.length} lines\nDownloaded to: ${outPath}` }] };
      }

      case 'audio_isolation': {
        const { audio_url, filename } = args;

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `isolated-${ts}.mp3`;
        const outPath = join(RAW_DIR, outFilename);

        const result = await kieRequest('POST', '/api/v1/jobs/createTask', { model: 'elevenlabs/audio-isolation', input: { audio_url } });
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed to start audio isolation.\nAPI response: ${JSON.stringify(result, null, 2)}` }] };

        const pollResult = await pollTask(taskId, 120000);
        const urls = extractResultUrls(pollResult);
        if (urls.length === 0) return { content: [{ type: 'text', text: `Audio isolation task ${taskId} done but no URLs found.` }] };

        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Audio isolated!\nDownloaded to: ${outPath}` }] };
      }

      // ── New Suno Tools ──

      case 'extend_music': {
        const { audioId, prompt, style, title, continueAt, model, defaultParamFlag, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `extend-${ts}.mp3`;
        const body = { audioId, prompt };
        if (style) body.style = style;
        if (title) body.title = title;
        if (continueAt !== undefined) body.continueAt = continueAt;
        if (model) body.model = model;
        if (defaultParamFlag !== undefined) body.defaultParamFlag = defaultParamFlag;
        const result = await sunoCreate('/api/v1/generate/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId, model: 'suno/extend', prompt: prompt?.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const sunoData = pollResult.sunoData;
        if (!sunoData?.length) return { content: [{ type: 'text', text: `Extend task ${taskId} completed but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
        return { content: [{ type: 'text', text: `✅ Music extended!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'cover_audio': {
        const { uploadUrl, prompt, customMode, instrumental, model, style, title, negativeTags, vocalGender, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `cover-${ts}.mp3`;
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
        taskHistory.push({ taskId, model: 'suno/cover', prompt: (prompt || uploadUrl).slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const sunoData = pollResult.sunoData;
        if (!sunoData?.length) return { content: [{ type: 'text', text: `Cover task ${taskId} completed but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
        return { content: [{ type: 'text', text: `✅ Audio cover created!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'add_instrumental': {
        const { uploadUrl, title, tags, negativeTags, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `instrumental-${ts}.mp3`;
        const body = { uploadUrl };
        if (title) body.title = title;
        if (tags) body.tags = tags;
        if (negativeTags) body.negativeTags = negativeTags;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/add-instrumental', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId, model: 'suno/add-instrumental', prompt: uploadUrl.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename);
        return { content: [{ type: 'text', text: `✅ Instrumental added!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'add_vocals': {
        const { prompt, uploadUrl, title, style, negativeTags, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `vocals-${ts}.mp3`;
        const body = { prompt, uploadUrl };
        if (title) body.title = title;
        if (style) body.style = style;
        if (negativeTags) body.negativeTags = negativeTags;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/add-vocals', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId, model: 'suno/add-vocals', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename);
        return { content: [{ type: 'text', text: `✅ Vocals added!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'replace_section': {
        const { taskId: origTaskId, audioId, prompt, infillStartS, infillEndS, tags, title, negativeTags, fullLyrics, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `replace-${ts}.mp3`;
        const body = { taskId: origTaskId, audioId, prompt, infillStartS, infillEndS };
        if (tags) body.tags = tags;
        if (title) body.title = title;
        if (negativeTags) body.negativeTags = negativeTags;
        if (fullLyrics) body.fullLyrics = fullLyrics;
        const result = await sunoCreate('/api/v1/generate/replace-section', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId, model: 'suno/replace-section', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const files = await downloadSunoTracks(pollResult.sunoData || [], outFilename);
        return { content: [{ type: 'text', text: `✅ Section replaced!\nTask ID: ${taskId}\nRange: ${infillStartS}s-${infillEndS}s\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'generate_lyrics': {
        const { prompt } = args;
        const body = { prompt: prompt.slice(0, 200) };
        const result = await sunoCreate('/api/v1/lyrics', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(taskId, 60000);
        const lyrics = pollResult.sunoData?.[0]?.text || pollResult.text || JSON.stringify(pollResult);
        return { content: [{ type: 'text', text: `✅ Lyrics generated!\nTask ID: ${taskId}\n\n${lyrics}` }] };
      }

      case 'convert_to_wav': {
        const { taskId: origTaskId, audioId, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `wav-${ts}.wav`;
        const outPath = join(RAW_DIR, outFilename);
        const body = { taskId: origTaskId, audioId };
        const result = await sunoCreate('/api/v1/wav/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(taskId, 120000);
        const wavUrl = pollResult.sunoData?.[0]?.audioUrl || pollResult.wavUrl;
        if (!wavUrl) return { content: [{ type: 'text', text: `WAV task ${taskId} done but no URL found.\n${JSON.stringify(pollResult)}` }] };
        await downloadToFile(wavUrl, outPath);
        return { content: [{ type: 'text', text: `✅ WAV converted!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'separate_vocals': {
        const { taskId: origTaskId, audioId, type: sepType = 'separate_vocal', filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `stems-${ts}.mp3`;
        const body = { taskId: origTaskId, audioId, type: sepType };
        const result = await sunoCreate('/api/v1/vocal-removal/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(taskId, 120000);
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Separation task ${taskId} done but no results.\n${JSON.stringify(pollResult)}` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
        return { content: [{ type: 'text', text: `✅ Vocals separated (${sepType})!\nTask ID: ${taskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
      }

      case 'generate_midi': {
        const { taskId: origTaskId, audioId, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `midi-${ts}.mid`;
        const outPath = join(RAW_DIR, outFilename);
        const body = { taskId: origTaskId };
        if (audioId) body.audioId = audioId;
        const result = await sunoCreate('/api/v1/midi/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(taskId, 120000);
        const midiUrl = pollResult.sunoData?.[0]?.midiUrl || pollResult.midiUrl;
        if (!midiUrl) return { content: [{ type: 'text', text: `MIDI task ${taskId} done but no URL found.\n${JSON.stringify(pollResult)}` }] };
        await downloadToFile(midiUrl, outPath);
        return { content: [{ type: 'text', text: `✅ MIDI exported!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'create_music_video': {
        const { taskId: origTaskId, audioId, author, domainName, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `musicvideo-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);
        const body = { taskId: origTaskId, audioId };
        if (author) body.author = author;
        if (domainName) body.domainName = domainName;
        const result = await sunoCreate('/api/v1/mp4/generate', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(taskId, 300000);
        const videoUrl = pollResult.sunoData?.[0]?.videoUrl || pollResult.videoUrl;
        if (!videoUrl) return { content: [{ type: 'text', text: `Music video task ${taskId} done but no URL found.\n${JSON.stringify(pollResult)}` }] };
        await downloadToFile(videoUrl, outPath);
        return { content: [{ type: 'text', text: `✅ Music video created!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'generate_sounds': {
        const { prompt, model = 'V5', soundLoop, soundTempo, soundKey, grabLyrics, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `sound-${ts}.mp3`;
        const body = { prompt, model };
        if (soundLoop !== undefined) body.soundLoop = soundLoop;
        if (soundTempo !== undefined) body.soundTempo = soundTempo;
        if (soundKey) body.soundKey = soundKey;
        if (grabLyrics !== undefined) body.grabLyrics = grabLyrics;
        const result = await sunoCreate('/api/v1/generate/sounds', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId, model: 'suno/sounds', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(taskId);
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Sounds task ${taskId} done but no results.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
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
        const pollResult = await pollSunoTask(newTaskId, 120000);
        const personaId = pollResult.personaId || pollResult.data?.personaId;
        return { content: [{ type: 'text', text: `✅ Persona created!\nTask ID: ${newTaskId}\nPersona ID: ${personaId || 'see result'}\nName: ${personaName}\n\nUse this Persona ID in future generate_music calls for character consistency.` }] };
      }

      case 'generate_mashup': {
        const { taskId, audioIds, prompt, model, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `mashup-${ts}.mp3`;
        const body = { audioIds };
        if (taskId) body.taskId = taskId;
        if (prompt) body.prompt = prompt;
        if (model) body.model = model;
        const result = await sunoCreate('/api/v1/generate/mashup', body);
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        taskHistory.push({ taskId: newTaskId, model: 'suno/mashup', prompt: prompt?.slice(0, 80) || 'mashup', filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(newTaskId);
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Mashup task ${newTaskId} done but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
        return { content: [{ type: 'text', text: `✅ Mashup created!\nTask ID: ${newTaskId}\n${files.map(f => `  → ${f.file}`).join('\n')}` }] };
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
        const outFilename = filename || `cover-art-${ts}.png`;
        const outPath = join(RAW_DIR, outFilename);
        const result = await sunoCreate('/api/v1/suno/cover/generate', { taskId });
        const newTaskId = result.data?.taskId || result.taskId;
        if (!newTaskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };
        const pollResult = await pollSunoTask(newTaskId, 120000);
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
        taskHistory.push({ taskId: kieAudioId, model: 'gemini-omni/voice', prompt: voiceName, status: 'success', createdAt: new Date().toISOString() });
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
        taskHistory.push({ taskId: characterId, model: 'gemini-omni/character', prompt: character_name || (descriptions ? descriptions.slice(0, 80) : '(unnamed)'), status: 'success', createdAt: new Date().toISOString() });
        return { content: [{ type: 'text', text: `✅ Visual character created!\nName: ${character_name || '(unnamed)'}\ncharacterId: ${characterId}\n\nUse this ID in generate_video model_options.character_ids array (only consumed by model='gemini-omni/video').` }] };
      }

      case 'upload_extend_audio': {
        const { uploadUrl, prompt, continueAt, model, style, title, instrumental, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `upload-extend-${ts}.mp3`;
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
        taskHistory.push({ taskId: newTaskId, model: 'suno/upload-extend', prompt: (prompt || uploadUrl).slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });
        const pollResult = await pollSunoTask(newTaskId);
        const sunoData = pollResult.sunoData || [];
        if (!sunoData.length) return { content: [{ type: 'text', text: `Extend task ${newTaskId} done but no tracks.` }] };
        const files = await downloadSunoTracks(sunoData, outFilename);
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
        const pollResult = await pollTask(taskId, 300000);
        const transcription = pollResult.resultJson || pollResult;
        return { content: [{ type: 'text', text: `✅ Transcription complete!\nTask ID: ${taskId}\n\n${typeof transcription === 'string' ? transcription : JSON.stringify(transcription, null, 2)}` }] };
      }

      // ── File Upload ──

      case 'upload_file': {
        const { file_url, base64_data, upload_path = 'uploads', file_name } = args;
        const UPLOAD_BASE = 'https://kieai.redpandaai.co';

        if (file_url) {
          const body = { fileUrl: file_url, uploadPath: upload_path };
          if (file_name) body.fileName = file_name;
          const res = await fetch(`${UPLOAD_BASE}/api/file-url-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await res.json();
          if (!result.success && result.code !== 200) return { content: [{ type: 'text', text: `Upload failed: ${JSON.stringify(result)}` }] };
          return { content: [{ type: 'text', text: `✅ File uploaded!\nURL: ${result.data?.fileUrl}\nDownload: ${result.data?.downloadUrl}\nExpires: ${result.data?.expiresAt}` }] };
        }

        if (base64_data) {
          const body = { base64Data: base64_data, uploadPath: upload_path };
          if (file_name) body.fileName = file_name;
          const res = await fetch(`${UPLOAD_BASE}/api/file-base64-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await res.json();
          if (!result.success && result.code !== 200) return { content: [{ type: 'text', text: `Upload failed: ${JSON.stringify(result)}` }] };
          return { content: [{ type: 'text', text: `✅ File uploaded!\nURL: ${result.data?.fileUrl}\nDownload: ${result.data?.downloadUrl}\nExpires: ${result.data?.expiresAt}` }] };
        }

        return { content: [{ type: 'text', text: 'Provide either file_url or base64_data to upload.' }] };
      }

      // ── Veo Extend & Upscale ──

      case 'veo_extend': {
        const { task_id, prompt, model = 'fast', seeds, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `veo-extend-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);

        const body = { taskId: task_id, prompt, model };
        if (seeds !== undefined) body.seeds = seeds;

        const result = await kieRequest('POST', '/api/v1/veo/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };

        taskHistory.push({ taskId, model: 'veo/extend', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        const pollResult = await pollTask(taskId, 900000, 'veo-3/text-to-video');
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Extend task ${taskId} done but no URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Veo video extended!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      case 'veo_upscale_1080p': {
        const { task_id, index = 0, filename } = args;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outFilename = filename || `veo-1080p-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);

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
        const outFilename = filename || `veo-4k-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);

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
        const outFilename = filename || `runway-extend-${ts}.mp4`;
        const outPath = join(RAW_DIR, outFilename);

        const body = { taskId: task_id, prompt, quality };
        const result = await kieRequest('POST', '/api/v1/runway/extend', body);
        const taskId = result.data?.taskId || result.taskId;
        if (!taskId) return { content: [{ type: 'text', text: `Failed — no taskId.\n${JSON.stringify(result, null, 2)}` }] };

        taskHistory.push({ taskId, model: 'runway/extend', prompt: prompt.slice(0, 80), filename: outFilename, status: 'polling', createdAt: new Date().toISOString() });

        // Runway uses its own poll endpoint
        const pollResult = await pollTask(taskId, 600000, 'runway/text-to-video');
        const resultUrls = extractResultUrls(pollResult);
        if (resultUrls.length === 0) return { content: [{ type: 'text', text: `Extend task ${taskId} done but no URLs.\n${JSON.stringify(pollResult, null, 2)}` }] };

        await downloadToFile(resultUrls[0], outPath);
        return { content: [{ type: 'text', text: `✅ Runway video extended!\nTask ID: ${taskId}\nDownloaded to: ${outPath}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
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
      res.end(JSON.stringify({ status: 'ok', version: '4.0.6', sessions: sessions.size }));
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
