// Vertical profile: Short-Form Social Video (issue #99).
// First video vertical. Doctrine: hook-first structure, image-first pipeline
// (approve a cheap still, then i2v — video credits are 10-50x image credits),
// platform UI safe zones, series consistency via reference-to-video, and
// platform AI-disclosure gates.
export default {
  id: 'social-video',
  name: 'Short-Form Social Video',
  media: ['video', 'audio'],
  summary: 'TikTok/Reels/Shorts content: hook clips, talking heads, product showcases, b-roll loops, multi-scene stories — with voiceover, music, and SFX.',
  lastReviewed: '2026-08-31',

  intake: [
    { key: 'deliverable', ask: 'What clip? (hook/opener / talking-head or avatar clip / product showcase / b-roll loop / multi-scene story / animate-an-existing-image / video series episode)', why: 'Each has different routing: avatars need dedicated models, loops need seamless ends, stories need multi-shot scripting.' },
    { key: 'platform_format', ask: 'Platform and placement? (TikTok/Reels/Shorts feed = 9:16; YouTube = 16:9; square feed = 1:1) Target length?', why: '9:16 via the aspect param, never letterboxed. Length drives cost directly — video bills per second, so a 15s clip at 50 cr/s is 750 cr; pick the tier to match.' },
    { key: 'hook', ask: 'What happens in the FIRST 2 seconds?', why: 'Retention is decided before second 3. The hook is a creative input, not an edit decision — prompt the opening beat explicitly (motion toward camera, reveal, pattern interrupt).' },
    { key: 'audio_plan', ask: 'Audio: model-native audio, voiceover (script text verbatim), music (genre/mood or trending-sound placeholder), SFX?', why: 'Native-audio models (veo, grok, pixverse, kling v3) bake sound in; separate voiceover/music via TTS + Suno mixes in post. Trending platform sounds must be added IN the platform app — never generate a copy.' },
    { key: 'talent', ask: 'Does a person appear? Real footage to re-dub, an AI presenter from a still, or no people?', why: 'Real-footage re-sync routes to lip-sync tools; an AI presenter routes to avatar models; both trigger the disclosure question.' },
    { key: 'disclosure', ask: 'Platform AI-disclosure: TikTok requires labeling realistic AI content; YouTube requires altered-content disclosure; ads add Meta/EU AI Act obligations. Does this clip depict realistic people/events?', why: 'Realistic AI people without the platform label risks takedown; the label is a checkbox at upload time — decide now.' },
    { key: 'series', ask: 'One-off or a series with a recurring character/style?', why: 'Series route through reference-to-video with the same character refs each episode — the video equivalent of the image profiles\' reference-anchoring.' },
    { key: 'caption_zones', ask: 'Will the platform UI overlay the video (TikTok right-rail icons, bottom caption band), and will you burn in captions?', why: 'Keep faces and key action in the center ~80%; bottom ~15% and right ~10% are covered by UI on TikTok/Reels. Burned captions live in the mid-lower third, above the UI band.' },
  ],

  routing: [
    { deliverable: 'hook/opener', tiers: {
        default: { model: 'grok-imagine-video-1-5-preview', note: '1.6-3 cr/s with audio — cheap enough to generate 5 hook variants and test' },
        value: { model: 'pixverse-v6/image-to-video', note: '4-9.6 cr/s, audio + templates; I2V is its strength — animate an approved still' },
        hero: { model: 'veo-3/text-to-video', note: '50 cr/s, native audio, best polish — finals only, after the hook concept is proven cheap' },
    }},
    { deliverable: 'talking-head or avatar clip', tiers: {
        default: { model: 'kling/ai-avatar-pro', note: 'AI presenter from a still + audio' },
        premium: { model: 'omnihuman-1-5', note: '27 cr/s — full-body animated performance from one image, best-in-class gesture' },
        from_audio: { model: 'infinitalk/from-audio', note: 'talking head driven directly by an audio file' },
        redub_real: { model: 'volcengine/video-to-video-lip-sync', note: 're-sync EXISTING single-person footage to new audio (8 cr/s; frontal faces only, yaw ≤30°) — dubbing, not generation' },
    }},
    { deliverable: 'product showcase', tiers: {
        default: { model: 'pixverse-v6/image-to-video', note: 'animate the approved packshot/lifestyle still from the product-photography profile' },
        cinematic: { model: 'veo-3/image-to-video', note: 'hero-grade motion + native audio for the ad-tier cut' },
        budget: { model: 'wan/flash-image-to-video', note: '6-8 cr/s drafts' },
    }},
    { deliverable: 'b-roll loop', tiers: {
        default: { model: 'hailuo/text-to-video-standard', note: '4 cr/s budget cinematic; prompt "seamless loop, end frame matches start"' },
        morph: { model: 'pixverse-v6/transition', note: 'first/last-frame morph — pass the SAME image as first and last frame for a true loop' },
    }},
    { deliverable: 'multi-scene story', tiers: {
        default: { model: 'kling-3-omni/text-to-video', note: 'per-shot scripting via customize_multi_shots + multi_prompt (14 cr/s @720p) — the storyboard-in-one-call model' },
        long_take: { model: 'bytedance/seedance-2-5', note: '30s single takes when one continuous shot beats cuts' },
        dialogue: { model: 'happyhorse-1-1/text-to-video', note: 'multilingual lip-synced dialogue baked in' },
    }},
    { deliverable: 'animate-an-existing-image', tiers: {
        default: { model: 'pixverse-v6/image-to-video', note: 'the general-purpose i2v workhorse' },
        physics: { model: 'veo-3-fast/image-to-video', note: 'faster/cheaper Veo tier for motion realism' },
    }},
    { deliverable: 'video series episode', tiers: {
        default: { model: 'happyhorse-1-1/reference-to-video', note: 'up to 9 refs, address them as [Image 1]..[Image 9] — recurring character + set refs every episode' },
        alt: { model: 'minimax-h3/reference-to-video', note: 'reference images + videos + audio in one call; 2K + stereo' },
        multimodal: { model: 'seedance-2/text-to-video', note: '9 images + 3 videos + 3 audio refs — richest reference surface' },
    }},
    { deliverable: 'finishing', tiers: {
        upscale: { model: 'topaz/video-upscale', note: 'delivery-res masters' },
        extend: { tool: 'veo_extend', note: 'lengthen a Veo clip; grok-imagine/extend and pixverse-v6/extend for their families' },
    }},
  ],

  promptFormulas: {
    'hook/opener': {
      structure: '[9:16 via aspect param] + [FIRST BEAT: what moves in second 0-2, toward-camera or reveal] + [subject + setting in one clause] + [camera: handheld/push-in/whip] + [audio cue if native-audio model]',
      example: 'Vertical 9:16. A hand slams a steaming pan down toward the camera, sauce splashing at the lens, then pulls back to reveal a tiny apartment kitchen. Handheld, fast push-in. SFX: sizzle spike then a beat drop.',
      perModel: {
        'grok-imagine-video-1-5-preview': 'Generate 3-5 hook variants — at ~2 cr/s that is cheaper than one Veo take.',
        'veo-3/text-to-video': '5-part formula (Cinematography + Subject + Action + Context + Style), concrete verbs, SFX: tags, dialogue in quotes.',
      },
      pitfalls: [
        'Video is 10-50x image cost: NEVER iterate concepts in video. Approve a still (nano-banana-2-lite, 4 cr) first, then animate it.',
        'One camera move + one subject action per clip — compound direction produces mush.',
        'Aspect via the API param; a "vertical crop" prompt letterboxes.',
        'Keep faces/action in the center ~80% — platform UI eats the edges.',
      ],
    },
    'talking-head or avatar clip': {
      structure: '[the still: framed chest-up, centered, eyes to camera] + [voiceover audio generated FIRST] + [energy/gesture note] + [background stays static]',
      pitfalls: [
        'Pipeline order matters: script → TTS audio → avatar model. The audio drives duration and cost.',
        'Realistic AI people REQUIRE the platform AI label — decide the disclosure before rendering.',
        'Never clone a voice without documented consent from the voice\'s owner.',
        'Volcengine re-dub is mouth-only: it cannot fix off-angle faces (yaw ≤30°) or add gestures.',
      ],
    },
    'multi-scene story': {
      structure: 'PER SHOT via multi_prompt: [duration] + [shot size + move] + [beat in one clause]; carry character/wardrobe description VERBATIM across shots',
      pitfalls: [
        'Character drift between shots is the failure mode — repeat the full character description in every shot prompt, or use a reference-to-video model instead.',
        '3 shots is the sweet spot; 5+ multiplies failure odds.',
      ],
    },
  },

  workflows: [
    { name: 'Image-first pipeline (the cost discipline)', steps: [
      'Concept stills on nano-banana-2-lite (4 cr each) until the frame is approved',
      'Animate the winner via i2v (pixverse-v6/image-to-video default)',
      'Voiceover via generate_gemini_tts (style-directed) or generate_tts; music via generate_music; SFX via generate_sfx',
      'Mix in the edit; upscale finals via topaz/video-upscale',
    ]},
    { name: 'AI presenter clip', steps: [
      'Write the script; check the disclosure answer covers a realistic AI person',
      'generate_gemini_tts for the voice (30 named voices, tone tags like [laughs]) — keep takes <60s on flash',
      'Presenter still (nano-banana-2, centered chest-up) → kling/ai-avatar-pro or omnihuman-1-5 with the audio',
      'Burn captions in the mid-lower third; upload with the platform AI label',
    ]},
    { name: 'Series with a recurring character', steps: [
      'Approve a character sheet once (the film profile\'s character-sheet-first workflow)',
      'Every episode: happyhorse-1-1/reference-to-video with the sheet as [Image 1] + episode-specific refs',
      'Keep 3-5 refs — more introduces conflicting guidance',
      'Same intro/outro music track across episodes (generate_music once, reuse the file)',
    ]},
    { name: 'Hook A/B sprint', steps: [
      '3-5 hook variants on grok-imagine-video-1-5-preview (~2 cr/s)',
      'Post as drafts/spark tests; let retention data pick',
      'Re-render the winner on veo-3/text-to-video or pixverse for the polished cut',
    ]},
  ],

  qualityChecklist: [
    'First 2 seconds contain the hook — watch it muted, it must still stop the scroll',
    'True 9:16 from the aspect param; faces and key action inside the center safe zone; captions above the platform UI band',
    'Audio levels: voiceover on top, music ducked under it; no clipped SFX spikes',
    'Lip-sync verified on every talking frame; hands and teeth checked (still the artifact hotspots)',
    'Loops actually loop — play it 3 times through',
    'Series episodes: character, wardrobe, and palette match the reference sheet',
    'Platform AI-disclosure label decided and applied where the content shows realistic people/events',
    'No generated copies of trending sounds or commercial music — platform-licensed audio is added in-app',
    'Voice cloning only with documented consent',
  ],
}
