// Extracted from server.mjs for reviewability (issue #46). Pure data — no
// server-scope references. Imported (and re-exported) by server.mjs.


export const PRICING = {
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
  'nano-banana-2-lite': 4,             // empirical 2026-07-02: one 1K gen consumed exactly 4.00 credits (kie's site advertises 3 — the balance delta says otherwise)
  'nano-banana-pro': 24,
  'omnihuman-1-5/subject-detection': 0, // FREE — empirical 2026-07-02: creditsConsumed=0 on a live run
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
  'wan/2-5-text-to-video': 12,        // kie published: 12 cr/s @720p (default), 20 @1080p. Was 3
  'wan/2-5-image-to-video': 12,
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
  'grok-imagine/upscale': 10,         // flat — kie published 10 cr/upscale (was 5)
  'grok-imagine/extend': 3,
  'bytedance/v1-pro-text-to-video': 6,
  'bytedance/v1-pro-image-to-video': 6,
  'bytedance/v1-pro-fast-image-to-video': 4,
  'bytedance/v1-lite-text-to-video': 3,
  'bytedance/v1-lite-image-to-video': 3,
  'topaz/video-upscale': 8,           // flat
  'infinitalk/from-audio': 4,
  // ── HappyHorse 1.0 (NEW April 2026) ──
  'happyhorse/text-to-video': 48,      // kie published (2026-07-12): 28 cr/s @720p, 48 @1080p (default). Was an 8 cr/s guess
  'happyhorse/image-to-video': 48,
  'happyhorse/reference-to-video': 48,
  'happyhorse/video-edit': 48,       // 28 @720p / 48 @1080p (default)
  // ── HappyHorse 1.1 (June 2026) — kie published: 22.5 cr/s @720p, 29 cr/s @1080p; default is 1080p ──
  'happyhorse-1-1/text-to-video': 29,
  'happyhorse-1-1/image-to-video': 29,
  'happyhorse-1-1/reference-to-video': 29,
  // ── Kling 3.0 Turbo (June 2026) — kie published: 18 cr/s @720p (default), 22.5 cr/s @1080p ──
  'kling/v3-turbo-text-to-video': 18,
  'kling/v3-turbo-image-to-video': 18,
  // ── Seedance 2 Mini (June 2026) — kie published: 20.5 cr/s @720p (default) / 9.5 @480p, no video input; 12.5/6 with video input.
  //    480p rate empirically confirmed 2026-07-02: one 4s 480p T2V consumed exactly 38.00 credits (9.5 cr/s). ──
  'bytedance/seedance-2-mini': 20.5,
  // ── Grok Imagine Video 1.5 preview (June 2026) — 3 cr/s @720p (default), 1.6 cr/s @480p.
  //    720p rate empirically confirmed 2026-07-02: one 4s 720p I2V consumed exactly 12.00 credits (3 cr/s). ──
  'grok-imagine-video-1-5-preview': 3,
  // ── OmniHuman 1.5 — kie published: 27 cr/s (billed on output = audio length) ──
  'omnihuman-1-5': 27,
  // ── Volcengine lip-sync — kie published: 8 cr/s of generated video (follows audio duration) ──
  'volcengine/video-to-video-lip-sync': 8,
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
  // ── Suno Voice API (custom voice cloning, #20) ──
  'suno/voice-validate': 0,    // "Generate Voice" — free (kie marketing 2026-07-12)
  'suno/voice-generate': 5,    // estimate — pricing not disclosed; flagged below
  'suno/voice-regenerate': 5,  // estimate
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

export const PRICING_ESTIMATED = new Set([
  'wan/2-5-text-to-video',
  'wan/2-5-image-to-video',
  'suno/voice-generate',
  'suno/voice-regenerate',
  'happyhorse/text-to-video',
  'happyhorse/image-to-video',
  'happyhorse/reference-to-video',
  'happyhorse/video-edit',
  'gemini-omni/video',
  // v4.1.0 additions: kie publishes per-second rates for these, but the rate varies by
  // resolution (and for seedance-2-mini by video-input presence) — the single number in
  // PRICING assumes the default config, so flag it as an estimate.
  'happyhorse-1-1/text-to-video',
  'happyhorse-1-1/image-to-video',
  'happyhorse-1-1/reference-to-video',
  'kling/v3-turbo-text-to-video',
  'kling/v3-turbo-image-to-video',
  'bytedance/seedance-2-mini',
  'grok-imagine-video-1-5-preview',
  'omnihuman-1-5',
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

export const PROMPT_CAPS = {
  // 800 — the tightest documented caps in the catalog
  'qwen2/text-to-image': 800,
  'qwen2/image-edit': 800,
  'wan/2-5-text-to-video': 800,
  'wan/2-5-image-to-video': 800,
  // 1500
  'hailuo/02-text-to-video-pro': 1500,
  'hailuo/02-text-to-video-standard': 1500,
  'hailuo/02-image-to-video-pro': 1500,
  'hailuo/02-image-to-video-standard': 1500,
  'wan/2-6-flash-image-to-video': 1500,
  'wan/2-6-flash-video-to-video': 1500,
  // 2000-3000
  'qwen/image-edit': 2000,
  'seedream/5-lite-text-to-image': 3000,
  // 5000 — the common ceiling
  'google/imagen4': 5000, 'google/imagen4-fast': 5000, 'google/imagen4-ultra': 5000,
  'google/nano-banana': 5000, 'google/nano-banana-edit': 5000,
  'ideogram/v3-text-to-image': 5000, 'ideogram/v3-edit': 5000, 'ideogram/v3-remix': 5000,
  'ideogram/character': 5000, 'ideogram/character-edit': 5000, 'ideogram/character-remix': 5000,
  'qwen/text-to-image': 5000, 'qwen/image-to-image': 5000,
  'wan/2-7-image': 5000, 'wan/2-7-image-pro': 5000,
  'wan/2-6-text-to-video': 5000, 'wan/2-6-image-to-video': 5000, 'wan/2-6-video-to-video': 5000,
  'wan/2-7-text-to-video': 5000, 'wan/2-7-image-to-video': 5000, 'wan/2-7-videoedit': 5000, 'wan/2-7-r2v': 5000,
  'wan/2-2-a14b-text-to-video-turbo': 5000, 'wan/2-2-a14b-image-to-video-turbo': 5000, 'wan/2-2-a14b-speech-to-video-turbo': 5000,
  'hailuo/2-3-image-to-video-pro': 5000, 'hailuo/2-3-image-to-video-standard': 5000,
  'kling/v2-1-standard': 5000, 'kling/v2-1-pro': 5000,
  'kling/v2-1-master-text-to-video': 5000, 'kling/v2-1-master-image-to-video': 5000,
  'kling/ai-avatar-standard': 5000, 'kling/ai-avatar-pro': 5000,
  'infinitalk/from-audio': 5000,
  'happyhorse/text-to-video': 5000, 'happyhorse/image-to-video': 5000,
  'happyhorse/reference-to-video': 5000, 'happyhorse/video-edit': 5000,
  'grok-imagine/text-to-video': 5000, // stated in prose, not schema
  // 10000+
  'bytedance/v1-pro-text-to-video': 10000, 'bytedance/v1-pro-image-to-video': 10000,
  'bytedance/v1-pro-fast-image-to-video': 10000,
  'bytedance/v1-lite-text-to-video': 10000, 'bytedance/v1-lite-image-to-video': 10000,
  'bytedance/seedance-2': 20000, 'bytedance/seedance-2-fast': 20000,
};
