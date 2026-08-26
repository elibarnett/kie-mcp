// Extracted from server.mjs for reviewability (issue #46). Pure data — no
// server-scope references. Imported (and re-exported) by server.mjs.


export const VIDEO_MODEL_REGISTRY = {
  // ── Dedicated endpoint models ──
  'veo-3/text-to-video': {
    name: 'Veo 3.1 Quality (Google)',
    description: 'Crown jewel of AI video. 7.2/10 benchmark, best prompt adherence (7.8/10). Native 48kHz audio with sub-120ms lip-sync. ~/clip but only 1-in-4 keepers for pro work.',
    capabilities: ['cinematic', 'audio', 'image-to-video', 'lip-sync'],
    research: { verdict: 'Crown jewel of AI video. Scores 7.2/10 on Curious Refuge benchmark with best prompt adherence (7.8/10) and motion quality (7.4/10). Native 48kHz audio with sub-120ms lip-sync latency. ~/clip but only 1-in-4 generations are keeper quality for pro work, making effective cost ~ per usable clip. Use for finals, hero shots, dialogue scenes. Prototype on Fast first.', bestFor: ['cinematic brand storytelling', 'dialogue scenes with lip-synced audio', 'product demos with accurate physics', 'film pre-visualization', 'broadcast-quality B-roll', '4K upscale-ready masters'], weaknesses: ['~ per 8s clip, effective ~ per usable clip', '8s max clip length', 'temporal consistency degrades on fast motion', 'text rendering unreliable', 'character identity melts after 5s', 'hands/fingers unnatural', 'English-centric lip sync only'], promptTechniques: ['5-part formula: [Cinematography]+[Subject]+[Action]+[Context]+[Style]', 'lead with camera language: "Medium shot, 85mm anamorphic"', 'aim for 100-150 words', 'use concrete verbs: "opens umbrella" not "experiences rain"', 'use quotation marks for dialogue', 'describe audio with SFX tags: "SFX: thunder cracks"', 'use timestamp prompting for multi-shot: [00:00-00:02] Wide...', 'name real light sources (neon signs, candlelight, golden hour)'], communityInsights: ['78% positive ROI by advertising professionals (92-respondent survey)', 'professional workflow: Fast for 80%, Quality for final 20%', 'over 275 million Veo videos created worldwide', 'one creator burned  in 8 days learning to prompt — real cost is 3-4x advertised'], costEfficiency: 'Premium at 50 cr/s (~/bin/zsh.25/s). 5x more than Kling 3.0. Justified only for final deliverables where cinematic quality and native audio are non-negotiable.', comparedTo: { 'kling-3/video': 'Kling wins on multi-shot, cost, 4K. Veo wins on cinematic polish and audio.', 'sora/text-to-video': 'Sora leads physics. Veo generates 30-40% faster with better audio.', 'seedance-2/text-to-video': 'Seedance has better creative control. Veo wins on cinematic polish.' }, lastResearched: '2026-04-19', sources: ['https://deepmind.google/models/veo/', 'https://curiousrefuge.com/blog/veo-31-quality-ai-video-generator-review', 'https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1'] },
    type: 'dedicated',
    endpoint: '/api/v1/veo/generate',
    pollEndpoint: '/api/v1/veo/record-info',
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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
    // Verified against kie's Veo docs + live probes 2026-08-05 (#65): the enum is
    // 16:9 | 9:16 | Auto. '1:1' was never supported — kie 422s "Ratio error" at create.
    aspectRatios: ['16:9', '9:16', 'Auto'],
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

  'bytedance/seedance-2-mini': {
    name: 'Seedance 2.0 Mini (ByteDance)',
    description: 'NEW (June 2026) — budget Seedance 2.0 tier. Full multimodal ref stack (9 imgs + 3 vids + 3 audio), ~2x faster than 2.0 Fast at comparable quality; capped at 720p.',
    capabilities: ['cinematic', 'audio', 'character', 'motion-control', 'music-video', 'lip-sync', 'multi-shot', 'latest', 'new', 'budget'],
    research: { verdict: 'ByteDance\'s budget tier of the Seedance 2.0 family (June 2026, launched via Dreamina alongside the Volcano Engine 2026 announcements) — explicitly "a cheaper way to do the same jobs, not a stripped-down model." Keeps the full multimodal reference stack (text + up to 9 images + 3 videos ≤15s total + 3 audio files ≤15s total, plus first/last-frame control and native audio) but cuts resolution to 480p/720p, trims duration to 4-15s with a 5-12s sweet spot, and gives up top-end fidelity on complex motion and aggressive camera work. Third-party testing puts it at comparable-or-better quality than Seedance 2.0 Fast while generating ~2x faster — it effectively supersedes Fast for iteration and short-form. Mini-specific benchmark data is thin: no formal Arena Elo for Mini itself. The rational workflow: iterate cheap on Mini at 480p, re-render finals on Seedance 2.0.', bestFor: ['high-volume prompt iteration before re-rendering finals on seedance-2/text-to-video', 'short-form social content at 720p in the 5-12s range', 'anime and stylized work — testers found no obvious downgrade vs Standard/Fast', 'lip-sync/talking-head clips — native audio included in base price', 'character-consistent multi-shot storytelling using the full reference stack', 'e-commerce product image-to-video at scale'], weaknesses: ['capped at 720p — unusable for 1080p+ deliverables (Seedance 2.0 goes to 1080p-2K)', 'quality gap widens on complex motion, detailed subjects, aggressive camera movement', 'shorter max duration (~15s) vs Seedance 2.0\'s up to 60s', 'inherited Seedance 2.0 failure modes: identity drift, warped hands/text, multi-ref system takes practice', 'unverified single source: a 5s 720p clip took ~3 minutes — slower than marketing implies', 'at 720p no-video-input (20.5 cr/s) it is barely cheaper than Seedance 2 Fast (20 cr/s) — real savings are at 480p or with video inputs'], promptTechniques: ['prompts written for Seedance 2.0/Fast transfer directly — same interface and grammar', 'front-load: first 20-30 words lock subject and core action; style/lighting after', 'assign explicit jobs to each reference file — the model does not reliably infer roles', 'one strong reference beats five weak ones', 'for realism add "no 3D, no cartoon, no VFX"', 'draft at 480p with audio off to minimize credits', 'input caps: 9 images ≤30MB each; 3 videos ≤15s total ≤50MB each; 3 audio ≤15s total ≤15MB each'], communityInsights: ['reception dominated by SEO/reseller blogs; genuine Reddit/X sentiment for Mini specifically not found as of 2026-07 — treat as provisional', 'consensus across blogs: Mini largely supersedes Seedance 2.0 Fast (~2x faster, comparable-or-better quality)', 'unverified single source (APIMart): vs Kling 3.0 Fast — lip-sync/audio 8.8 vs 8.2, speed/stability 8.8 vs 6.9, >90% success rate', 'Seedance 2.5 (30s, 4K) announced June 23, 2026 and "coming soon" — may compress Mini\'s window at the top while cementing its budget role'], costEfficiency: 'kie.ai published: 480p = 9.5 cr/s ($0.0475) no-video / 6 cr/s with video input; 720p = 20.5 cr/s ($0.1025) no-video / 12.5 cr/s with video (with-video billed on input+output seconds). Real savings vs Seedance 2.0 (25 cr/s) are at 480p (~2.6x cheaper); plain 720p T2V is essentially Fast-priced — you buy speed, not a discount.', comparedTo: { 'seedance-2/text-to-video': 'Same multimodal stack, ~half the cost at 480p, but capped at 720p vs 1080p-2K and shorter clips. Mini to iterate, 2.0 for finals.', 'seedance-2-fast/text-to-video': 'Mini\'s direct victim: ~2x faster at comparable-or-better quality; Fast is now the legacy draft tier.', 'seedance/text-to-video': '1.5 Pro (8 cr/s) is still much cheaper per second but previous-gen: no full multimodal referencing. Mini is the cheapest way into the 2.0 architecture.', 'happyhorse-1-1/text-to-video': 'HappyHorse 1.1 has higher with-audio Elo and 7-language lip-sync but images-only refs; Mini\'s 480p tier is far cheaper for drafting.' }, lastResearched: '2026-07-02', sources: ['https://kie.ai/seedance-2-0-mini', 'https://www.atlascloud.ai/blog/guides/seedance-2-0-mini-performance-review', 'https://apimart.ai/blog/seedance-2-mini-vs-kling-3-0-fast-cheap-ai-video-api-comparison', 'https://www.xmk.com/seedance/blog/seedance-2-0-mini-guide', 'https://dreamina.capcut.com/seedance/seedance-2-0-mini-vs-seedance-2-0'] },
    type: 'market',
    apiModel: 'bytedance/seedance-2-mini',
    maxPromptChars: 20000,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'],
    options: {
      duration: { type: 'number', min: 4, max: 15, default: 5, description: 'Duration in seconds (4-15)' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p', description: '480p is ~2x cheaper — use for drafts' },
      generate_audio: { type: 'boolean', default: false, description: 'Generate native audio (increases cost)' },
      first_frame_url: { type: 'string', description: 'Optional first frame image URL' },
      last_frame_url: { type: 'string', description: 'Optional last frame image URL' },
      reference_image_urls: { type: 'array', description: 'Up to 9 reference images for style/character' },
      reference_video_urls: { type: 'array', description: 'Up to 3 reference videos (≤15s total) for motion/composition' },
      reference_audio_urls: { type: 'array', description: 'Up to 3 reference audio files (≤15s total)' },
      web_search: { type: 'boolean', default: false, description: 'Online search (T2V only)' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || 5, resolution: opts.resolution || '720p' };
      if (opts.generate_audio) input.generate_audio = true;
      if (opts.first_frame_url) input.first_frame_url = opts.first_frame_url;
      else if (imageUrls?.[0]) input.first_frame_url = imageUrls[0];
      if (opts.last_frame_url) input.last_frame_url = opts.last_frame_url;
      if (opts.reference_image_urls) input.reference_image_urls = opts.reference_image_urls;
      else if (imageUrls?.length > 1) input.reference_image_urls = imageUrls.slice(1);
      if (opts.reference_video_urls) input.reference_video_urls = opts.reference_video_urls;
      if (opts.reference_audio_urls) input.reference_audio_urls = opts.reference_audio_urls;
      if (opts.web_search) input.web_search = true;
      return input;
    },
  },

  'bytedance/seedance-2-5': {
    name: 'Seedance 2.5 (ByteDance)',
    description: 'ByteDance flagship: 30s single-take clips (2x the 2.0 ceiling), audio co-generation, region re-draw. kie surface: 480p/720p, 4-30s. LIVE since Aug 2026 — verified with a real generation 2026-08-10 (4s @480p cost exactly 112 cr = the published 28 cr/s). 720p default runs 63 cr/s — check pricing before long takes.',
    capabilities: ['cinematic', 'audio', 'character', 'motion-control', 'music-video', 'lip-sync', 'multi-shot', 'long-form', 'latest', 'new'],
    research: { verdict: 'Announced on stage at Volcano Engine 2026 (June 23), API opened ~July 16 via BytePlus/Volcano — young and largely vendor-benchmarked. The generational pitch: 30-second native single-shot generation (2x Seedance 2.0), reference capacity jumping to 50 mixed multimodal inputs upstream, audio co-generated in a unified latent space, region-level re-draw editing, and a 3D white-box camera blockout system. Every quality claim (including ByteDance\'s "+20% prompt adherence") is vendor-supplied — no Artificial Analysis entry for 2.5 exists yet, and any circulating Elo is fabricated. NOTE the kie surface is narrower than the marketing: live probes (2026-07-27) show 480p/720p only (no 4K), duration 4-30s, and the Mini-style field set — treat kie\'s 2.5 as "Seedance 2.0 with 30s takes", not the full 50-ref/4K stack. Use 2.0 for benchmarked ship-now work; test 2.5 for long-form consistency.', bestFor: ['long single-take narratives up to 30s without stitching (product demos, branded short drama, continuous-scene ads)', 'reference-driven consistency work across longer takes', 'multilingual dialogue content (11 languages with synchronized lip movement, vendor-claimed)', 'soundscape-in-one-pass generation — prompt the audio directly'], weaknesses: ['no independent benchmarks or Arena Elo as of late July 2026 — all quality claims are ByteDance launch numbers', 'kie exposes only 480p/720p despite the 4K marketing (probed)', '30s generations are computationally heavy — expect long queues; latency/retry rates unverified', 'carryover 2.0 issues not confirmed fixed: aggressive content filters, unreliable on-screen text, close-up hand-object interaction', 'pricing was unpublished at kie launch — see costEfficiency'], promptTechniques: ['write for one continuous take: describe how subject and camera evolve across the whole 30s, not a single instant (SPACE checklist: Subject, Performance, Ambience, Camera, Extra cues)', 'name the camera move in plain language ("slow push-in", "low tracking shot") instead of "cinematic"', 'label every reference\'s role in the prompt', 'prompt the soundscape directly since audio is co-generated', 'don\'t cram multiple sequences into one prompt'], communityInsights: ['reception is cautious optimism — a genuine generational step, but reviewers stress no independent side-by-sides of 30s outputs existed at launch', 'multiple trackers warn any pre-launch Seedance 2.5 Elo is fabricated (quoted numbers are 2.0\'s)', 'expert pattern: "use 2.0 for work that must ship now; test 2.5 if longer storytelling or controlled edits are central" (seedance.tv)', 'copyright controversy shadows the launch — an AI copyright commercialization platform was announced alongside'], costEfficiency: 'kie had no published rate at launch (empty pricingDesc; page said Coming Soon while the slug already routed). Community forecasts ran $0.12-0.50/s; Seedance 2.0 is 25 cr/s @720p on kie, so expect 2.5 at or above that. The MCP measures the ACTUAL charge per generation (creditsConsumed) — trust the [actual] line over the table estimate.', comparedTo: { 'seedance-2/text-to-video': '2.5 doubles native duration (30s vs 15s) and adds region editing; 2.0 remains the benchmarked, arena-proven option (~1229 with-audio T2V Elo, #2 late July).', 'bytedance/seedance-2-mini': 'Mini stays the budget tier; 2.5 is the opposite end — maximum capability, higher per-clip cost.', 'kling-3/video': 'Seedance 2.0 already led Kling 3.0 (~1105) on Arena; 2.5\'s 30s takes extend the duration gap on paper, unverified in practice.', 'veo-3/text-to-video': '2.5\'s 30s single pass is ~4x Veo\'s longest clip; Veo retains native 4K (which kie\'s 2.5 surface lacks).' }, lastResearched: '2026-07-27', sources: ['https://kie.ai/blog/seedance-2-5-release-deep-dive', 'https://www.cined.com/bytedance-seedance-2-5-api-goes-live-30-second-single-shot-clips-50-reference-inputs-and-3d-camera-blockouts/', 'https://www.seedance.tv/blog/seedance-2-5-review-2026', 'https://unifically.com/blogs/seedance-2.5-vs-seedance-2.0', 'https://artificialanalysis.ai/video/leaderboard/text-to-video'] },
    type: 'market',
    apiModel: 'bytedance/seedance-2-5',
    maxPromptChars: 20000,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    options: {
      duration: { type: 'number', min: 4, max: 30, default: 5, description: 'Duration in seconds (4-30 — probed live; 30s single takes are the headline feature)' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p', description: 'kie exposes 480p/720p only (probed 2026-07-27; 1080p/2k/4k rejected)' },
      generate_audio: { type: 'boolean', default: false, description: 'Co-generate audio (increases cost)' },
      first_frame_url: { type: 'string', description: 'Optional first frame image URL' },
      reference_image_urls: { type: 'array', description: 'Reference images for style/character' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, duration: opts.duration || 5, resolution: opts.resolution || '720p' };
      if (opts.generate_audio) input.generate_audio = true;
      if (opts.first_frame_url) input.first_frame_url = opts.first_frame_url;
      else if (imageUrls?.[0]) input.first_frame_url = imageUrls[0];
      if (opts.reference_image_urls) input.reference_image_urls = opts.reference_image_urls;
      else if (imageUrls?.length > 1) input.reference_image_urls = imageUrls.slice(1);
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
  // ── Wan 3.0 — unified prompt-or-media video (standard + Prime tiers) ──
  'wan/3-0-video': {
    name: 'Wan 3.0',
    description: 'NEW (Aug 2026) — Alibaba\'s next-gen unified video model ("prompt or media" input), optional audio, up to 1080P. 8 cr/s @480P / 16 @720P / 32 @1080P. NOTE kie bills (input video duration + output duration) × rate.',
    capabilities: ['cinematic', 'audio', 'latest', 'new'],
    research: { verdict: 'Wan 3.0 landed on kie August 2026 as a unified endpoint — the creation-time validator says "prompt or media is required", so it accepts text and/or media input on one slug rather than Wan 2.x\'s per-modality slugs. Docs-scraped surface: prompt, resolution (480P/720P/1080P — uppercase P), aspect_ratio incl. adaptive, duration, audio boolean. Standard tier is priced 20% below official (8/16/32 cr/s); the Prime tier (separate slug) is the premium variant at ~1.5x (12.2/25.2/50.4, 10% below official). Both slugs live-probed 2026-08-26; no kie-side generations yet, so treat quality claims as pending — Wan 2.7 remains the family\'s proven tier. Distinctive billing rule: (input video duration + output duration) × unit price, so media-driven calls cost more than the output length alone.', bestFor: ['next-gen Wan drafts at 480P (8 cr/s — cheap for a current-gen model)', 'unified text+media workflows without picking a per-modality slug', 'audio-in-one-pass at Wan pricing'], weaknesses: ['no independent benchmarks or kie-side empirical data yet', 'input media duration is billed too — long source clips inflate cost', 'kie documents the surface thinly; option enums are docs-sample-derived'], promptTechniques: ['cinematic prose prompts as with Wan 2.7; specify camera movement explicitly', 'keep source media short — billing counts input duration', 'aspect_ratio "adaptive" follows the input media'], costEfficiency: 'Standard 8/16/32 cr/s (480/720/1080P), Prime 12.2/25.2/50.4 — published, not yet empirically confirmed (PRICING_ESTIMATED). Table prices the 480P sample default.', comparedTo: { 'wan/2-7-text-to-video': '2.7 is benchmark-proven with a full modality suite; 3.0 is the unified next gen — prefer 2.7 for production until 3.0 gets evals.', 'wan/3-0-video-prime': 'Prime is ~1.5x for the premium tier of the same model.' }, lastResearched: '2026-08-26', sources: ['https://docs.kie.ai/market/wan/3-0-video', 'https://kie.ai/wan3.0-video'] },
    type: 'market',
    apiModel: 'wan/3-0-video',
    aspectRatios: ['adaptive', '16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Output duration in seconds' },
      resolution: { type: 'string', enum: ['480P', '720P', '1080P'], default: '480P', description: '8 / 16 / 32 cr/s (uppercase P per kie docs)' },
      audio: { type: 'boolean', default: false, description: 'Native audio' },
      image_urls: { type: 'array', description: 'Optional media input (unified endpoint accepts prompt and/or media)' },
      video_urls: { type: 'array', description: 'Optional video input — NOTE its duration is billed too' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { resolution: opts.resolution || '480P', aspect_ratio: aspectRatio || 'adaptive', duration: opts.duration ?? 5, audio: opts.audio ?? false };
      if (prompt) input.prompt = prompt;
      const imgs = opts.image_urls || imageUrls;
      if (imgs && imgs.length) input.image_urls = imgs;
      if (opts.video_urls && opts.video_urls.length) input.video_urls = opts.video_urls;
      return input;
    },
  },
  'wan/3-0-video-prime': {
    name: 'Wan 3.0 Prime',
    description: 'NEW (Aug 2026) — premium tier of Wan 3.0 (same unified surface), ~1.5x the standard rate: 12.2 cr/s @480P / 25.2 @720P / 50.4 @1080P. Same (input + output duration) billing rule.',
    capabilities: ['cinematic', 'audio', 'latest', 'new'],
    type: 'market',
    apiModel: 'wan/3-0-video-prime',
    aspectRatios: ['adaptive', '16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5 },
      resolution: { type: 'string', enum: ['480P', '720P', '1080P'], default: '480P', description: '12.2 / 25.2 / 50.4 cr/s' },
      audio: { type: 'boolean', default: false },
      image_urls: { type: 'array', description: 'Optional media input' },
      video_urls: { type: 'array', description: 'Optional video input — duration billed' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { resolution: opts.resolution || '480P', aspect_ratio: aspectRatio || 'adaptive', duration: opts.duration ?? 5, audio: opts.audio ?? false };
      if (prompt) input.prompt = prompt;
      const imgs = opts.image_urls || imageUrls;
      if (imgs && imgs.length) input.image_urls = imgs;
      if (opts.video_urls && opts.video_urls.length) input.video_urls = opts.video_urls;
      return input;
    },
  },
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
  // ── Kling 3.0 Omni ("Kling O3") — unified multi-shot T2V/I2V/R2V + video Transformation ──
  'kling-3-omni/text-to-video': {
    name: 'Kling 3.0 Omni T2V',
    description: 'NEW (Aug 2026) — Kling O3 unified model: per-shot scripting (multi_prompt), optional native audio, up to 4K. 14 cr/s @720p no-audio.',
    capabilities: ['cinematic', 'multi-shot', 'audio', 'latest', 'new'],
    research: { verdict: 'Kuaishou\'s "Kling O3" / 3.0 Omni family, live on kie August 2026 — the unified any-to-any evolution of Kling 3.0: one architecture spanning T2V, I2V, reference-to-video, and a new video Transformation modality (restyle an existing clip while preserving its motion). Headline controls: per-shot scripting via customize_multi_shots + multi_prompt (each shot gets its own prompt and duration — the most explicit multi-shot API on kie), native audio co-generation, and output up to 4K. Young on kie: entries are docs-scraped and live-probed (all four slugs route, 2026-08-26) but not yet empirically generated; independent benchmarks pending. Priced below Kling 3.0 standard at 720p (14 vs 14-20 cr/s) with the same 67 cr/s 4K ceiling.', bestFor: ['multi-shot sequences with explicit per-shot prompts and durations', 'restyling existing footage while keeping motion (Transformation — unique modality on kie with Wan 2.7 Edit the nearest neighbor)', 'character-consistent videos from reference images (R2V)', 'audio-in-one-pass generation up to 4K'], weaknesses: ['no kie-side empirical generation data yet — rates and quality unverified beyond routing probes', 'multi_prompt shot durations must sum sensibly with total duration (kie does not document the reconciliation rule)', '4K tier is 3.4-4.8x the 720p rate', 'Transformation requires video input billed at its own higher tier'], promptTechniques: ['set customize_multi_shots: true and give each shot a one-sentence prompt + duration in multi_prompt', 'Transformation: describe the target style AND what to preserve ("...while preserving the character movements")', 'audio: false is the default cost saver — enable per-take only when needed'], costEfficiency: 'Table prices the 720p no-audio default: 14 cr/s T2V/I2V/R2V (audio 18; 1080p 18/23; 4K 67), Transformation 20 cr/s @720p (27 @1080p, 67 @4K, video input required). Published by kie, not yet empirically confirmed — PRICING_ESTIMATED.', comparedTo: { 'kling-3/video': 'Same-price entry tier; Omni adds per-shot multi_prompt scripting, R2V, and Transformation. 3.0 remains the benchmark-proven choice until Omni gets independent evals.', 'wan/2-7-video-edit': 'Both restyle existing video; Omni Transformation adds the 4K ceiling and audio.' }, lastResearched: '2026-08-26', sources: ['https://docs.kie.ai/market/kling/v3-omni-text-to-video', 'https://docs.kie.ai/market/kling/v3-omni-transformation', 'https://kie.ai/kling-o3'] },
    type: 'market',
    apiModel: 'kling-3.0-omni/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Total duration in seconds' },
      resolution: { type: 'string', enum: ['720p', '1080p', '4K'], default: '720p', description: '720p 14 cr/s → 1080p 18 → 4K 67 (no-audio rates)' },
      audio: { type: 'boolean', default: false, description: 'Native audio co-generation (720p 14→18, 1080p 18→23 cr/s)' },
      customize_multi_shots: { type: 'boolean', default: false, description: 'Enable per-shot scripting via multi_prompt' },
      multi_prompt: { type: 'array', description: 'Per-shot list of {prompt, duration} objects (with customize_multi_shots: true)' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '720p', duration: opts.duration ?? 5, audio: opts.audio ?? false };
      if (opts.customize_multi_shots) { input.customize_multi_shots = true; input.multi_prompt = opts.multi_prompt || []; }
      return input;
    },
  },
  'kling-3-omni/image-to-video': {
    name: 'Kling 3.0 Omni I2V',
    description: 'NEW (Aug 2026) — Kling O3 image-to-video with multi-shot scripting and optional audio, up to 4K. 14 cr/s @720p no-audio.',
    capabilities: ['cinematic', 'multi-shot', 'audio', 'latest', 'new'],
    type: 'market',
    apiModel: 'kling-3.0-omni/image-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5 },
      resolution: { type: 'string', enum: ['720p', '1080p', '4K'], default: '720p' },
      audio: { type: 'boolean', default: false },
      customize_multi_shots: { type: 'boolean', default: false },
      multi_prompt: { type: 'array', description: 'Per-shot {prompt, duration} list' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '720p', duration: opts.duration ?? 5, audio: opts.audio ?? false };
      if (opts.customize_multi_shots) { input.customize_multi_shots = true; input.multi_prompt = opts.multi_prompt || []; }
      return input;
    },
  },
  'kling-3-omni/reference-to-video': {
    name: 'Kling 3.0 Omni R2V',
    description: 'NEW (Aug 2026) — Kling O3 reference-to-video: character/style consistency from reference images, multi-shot scripting, optional audio. 14 cr/s @720p no-audio (+video-input tier 20/27).',
    capabilities: ['character', 'multi-shot', 'audio', 'latest', 'new'],
    type: 'market',
    apiModel: 'kling-3.0-omni/reference-to-video',
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5 },
      resolution: { type: 'string', enum: ['720p', '1080p', '4K'], default: '720p' },
      audio: { type: 'boolean', default: false },
      customize_multi_shots: { type: 'boolean', default: false },
      multi_prompt: { type: 'array', description: 'Per-shot {prompt, duration} list' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '720p', duration: opts.duration ?? 5, audio: opts.audio ?? false };
      if (opts.customize_multi_shots) { input.customize_multi_shots = true; input.multi_prompt = opts.multi_prompt || []; }
      return input;
    },
  },
  'kling-3-omni/transformation': {
    name: 'Kling 3.0 Omni Transformation',
    description: 'NEW (Aug 2026) — restyle an EXISTING video while preserving its motion (video-to-video). Pass the source via model_options.video_urls. 20 cr/s @720p (27 @1080p, 67 @4K).',
    capabilities: ['video-edit', 'style-transfer', 'latest', 'new'],
    type: 'market',
    apiModel: 'kling-3.0-omni/transformation',
    aspectRatios: ['auto', '16:9', '9:16'],
    options: {
      video_urls: { type: 'array', description: 'REQUIRED — public URL(s) of the source video to transform' },
      resolution: { type: 'string', enum: ['720p', '1080p', '4K'], default: '720p' },
      audio: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, video_urls: opts.video_urls || [], aspect_ratio: aspectRatio || 'auto', resolution: opts.resolution || '720p', audio: opts.audio ?? false };
    },
  },
  'kling/v3-turbo-text-to-video': {
    name: 'Kling 3.0 Turbo T2V',
    description: 'NEW (June 2026) — speed-optimized Kling 3.0 tier. Keeps vCoT reasoning, multi-shot (6 cuts), bundled audio + 5-language lip-sync; caps at 1080p. Faster queue, not a discount tier.',
    capabilities: ['cinematic', 'audio', 'multi-shot', 'lip-sync', 'latest', 'new'],
    research: { verdict: 'Released June 17, 2026 as Kuaishou\'s speed-optimized tier of the 3.0 generation, explicitly positioned as a "fast preview / rapid iteration" model. Keeps the headline 3.0 features — Visual Chain-of-Thought prompt reasoning, multi-shot up to 6 cuts, 3-15s durations, bundled audio with improved 5-language lip-sync — but caps output at 1080p (vs native 4K on full 3.0) and drops Motion Brush/storyboard tooling. Contrary to the 2.5-Turbo-means-cheap pattern, per-second pricing sits BETWEEN Kling 3.0 Standard and Pro — it is a latency play with audio bundled, not a budget tier. Too new for an Artificial Analysis Elo; quality claims rest on vendor copy. Best mental model: Kling 3.0-class output, faster queue, 1080p ceiling — draft on Turbo, finish hero shots on full 3.0.', bestFor: ['high-volume / fast-turnaround social and ad clips where queue speed matters more than 4K', 'dialogue and talking-head content — improved 5-language lip-sync with audio bundled in the price', 'multi-shot sequences (up to 6 shots, 3-15s) at 1080p without full 3.0 Pro rates', 'rapid preview passes before re-rendering finals on kling-3/video'], weaknesses: ['1080p ceiling — no native 4K', 'no Motion Brush or storyboard tooling', 'not the cheapest Kling — costs more per second than silent Kling 3.0 Standard', 'no published Arena Elo yet (released 2026-06-17)', '3.0-generation weaknesses presumably carry over: background boiling in foliage, occasional extra fingers, audio degrades with 3+ speakers, strict NSFW filter', '"faster" is asserted by Kuaishou but unquantified in every source consulted'], promptTechniques: ['multi-shot syntax: "shot <n>, <seconds>, <prompt>" — up to 6 shots, ~512 chars each; model auto-generates transitions', 'use the Kling 4-part formula: Subject + Action + Context + Style with concrete camera language', 'put dialogue in quotation marks to drive the lip-sync engine; specify speaker language', 'vCoT rewards complex multi-element prompts — describe scene logic, not mood words', 'draft on Turbo, re-render the winning prompt on kling-3/video for 4K'], communityInsights: ['genuine community reception essentially absent as of 2026-07 — all coverage is press releases and provider blogs', 'official launch framing is "fast video previews for rapid creative iteration"', 'unverified single source (Atlas Cloud): improved lip-sync removes "uncanny drift" in mouth tracking', 'unverified single source (EvoLink): at 720p Turbo bills ~33% more per second than silent standard 3.0 — measure cost per accepted clip'], costEfficiency: 'kie.ai published: 18 cr/s ($0.09) at 720p, 22.5 cr/s ($0.1125) at 1080p, audio included. More than Kling 3.0 (12 cr/s) — you pay for speed + bundled audio, not savings. Kling 2.5 Turbo (8 cr/s) remains ~40% cheaper for silent drafts. 15s max 1080p clip ≈ 338 cr (~$1.69).', comparedTo: { 'kling-3/video': 'Same generation but Turbo caps at 1080p vs 4K and drops the creative tooling; renders faster. Use Turbo for volume/dialogue/iteration, 3.0 for hero shots.', 'kling/v2-5-turbo-text-to-video': '2.5 Turbo is ~40% cheaper but has no audio, no multi-shot, no lip-sync, fixed 5/10s durations.', 'happyhorse-1-1/text-to-video': 'HappyHorse 1.1 leads on with-audio Arena Elo (~1150 vs Kling 3.0 Pro\'s 1105) and 7-language lip-sync; Kling Turbo counters with 6-shot sequencing at a similar rate.', 'veo-3-fast/text-to-video': 'Veo 3 Fast (21 cr/s) has better cinematic polish but 8s cap and no multi-shot; Turbo gives 15s and 6 shots at slightly less.' }, lastResearched: '2026-07-02', sources: ['https://www.atlascloud.ai/blog/guides/kling-3.0-turbo-vs-kling-3.0', 'https://evolink.ai/blog/kling-3-0-turbo-api-pricing-model-ids', 'https://www.imagine.art/blogs/kling-3-0-turbo-overview', 'https://kie.ai/kling-3-0-turbo', 'https://www.barchart.com/story/news/2548638/kling-3-0-turbo-released-kling-ai-brings-fast-video-previews-for-rapid-creative-iteration'] },
    type: 'market',
    apiModel: 'kling/v3-turbo-text-to-video',
    maxPromptChars: 2500,
    aspectRatios: ['16:9', '9:16', '1:1'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15), billed per second with 3s minimum' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio || '16:9', duration: String(opts.duration || 5), resolution: opts.resolution || '720p' };
    },
  },
  'kling/v3-turbo-image-to-video': {
    name: 'Kling 3.0 Turbo I2V',
    description: 'Kling 3.0 Turbo image-to-video — first-frame conditioning with bundled audio + lip-sync at 1080p max. Output aspect follows the input image.',
    capabilities: ['cinematic', 'animation', 'image-to-video', 'audio', 'lip-sync', 'latest', 'new'],
    research: { verdict: 'The I2V endpoint of Kling 3.0 Turbo: first-frame conditioning — prompt + single image (JPEG/PNG, ≤10MB) + duration + resolution, with output aspect ratio following the input image. Kling I2V has historically been the family\'s strongest mode for image fidelity, and Turbo brings the 3.0-generation vCoT reasoning and bundled audio to it at a faster queue. Multi-shot shot-syntax is documented only for the T2V endpoint. Same 1080p ceiling and pricing as Turbo T2V.', bestFor: ['animating stills with synchronized audio and lip-synced dialogue', 'fast iteration on image-anchored ad clips', 'talking-head content from a portrait keyframe', 'first-frame-controlled product animations'], weaknesses: ['single image only, no multi-reference', 'no aspect_ratio parameter — output follows the input image', 'multi-shot syntax not documented for I2V', 'same 1080p ceiling and carried-over 3.0-generation quirks as T2V'], promptTechniques: ['prompt for motion, camera, and audio context — not visual content (the image defines that)', 'put dialogue in quotes for the lip-sync engine', 'use clean, well-lit source images ≤10MB'], communityInsights: ['too new for independent I2V benchmarks — vendor claims only', 'Kling I2V historically strongest for image fidelity in the family'], costEfficiency: 'Same published rates as T2V: 18 cr/s at 720p, 22.5 cr/s at 1080p, audio included.', comparedTo: { 'kling/image-to-video': 'Kling 2.6 I2V (10 cr/s) is cheaper with audio; Turbo adds 3.0-generation reasoning, 15s durations, and faster queues.', 'happyhorse-1-1/image-to-video': 'HappyHorse 1.1 I2V has the higher with-audio Arena Elo (~1117, #2); Kling Turbo is cheaper at 720p (18 vs 22.5 cr/s).' }, lastResearched: '2026-07-02', sources: ['https://www.atlascloud.ai/blog/guides/kling-3.0-turbo-vs-kling-3.0', 'https://evolink.ai/blog/kling-3-0-turbo-api-pricing-model-ids', 'https://kie.ai/kling-3-0-turbo'] },
    type: 'market',
    apiModel: 'kling/v3-turbo-image-to-video',
    maxPromptChars: 2500,
    requiresImage: true,
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15), billed per second with 3s minimum' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_urls: imageUrls.slice(0, 1), duration: String(opts.duration || 5), resolution: opts.resolution || '720p' };
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
  'grok-imagine-video-1-5-preview': {
    name: 'Grok Imagine Video 1.5 (preview)',
    description: 'NEW (June 2026) — xAI Aurora engine. Image-to-video ONLY in this preview snapshot (image_urls required despite docs marking it nullable — probed live 2026-07-02). 1-15s, native synced audio + lip-sync, 720p max. Debuted #1 on I2V Arena. Cheapest with-audio video model.',
    capabilities: ['animation', 'audio', 'lip-sync', 'image-to-video', 'latest', 'new', 'budget'],
    research: { verdict: 'Announced by xAI ~June 17, 2026 (kie serves the earlier 1-5-preview snapshot). A major step over Grok Imagine 1.0: moves to the Aurora autoregressive-MoE engine, stretches clips from ~6-10s to a flexible 1-15s, and generates video plus synchronized audio (lip-synced dialogue, SFX, music) in a single pass at up to 720p/24fps. Debuted #1 on the Image-to-Video Arena ahead of Sora 2, Veo 3.1, Seedance 2.0, and Kling in blind testing (exact Elo figures conflict across sources — treat as unverified). Remains the budget-speed play: trade-offs are a hard 720p ceiling, persistently weak fast-action/combat physics, contextual rather than reliably scriptable audio, and preview-snapshot caveats.', bestFor: ['image-to-video animation with synchronized native audio in one generation', 'fast, cheap short-form social clips (9:16 supported, 1-15s)', 'iterating draft variants at 480p/1.6 cr/s before re-rendering keepers at 720p', 'multi-shot sequences via extend-from-frame chaining', 'cost-conscious workflows where 720p is acceptable'], weaknesses: ['720p ceiling — well below Kling 3.0 and Veo upscale paths', 'fast action, combat, and complex physical interactions remain weak — no improvement over 1.0', 'audio is contextual, not fully scriptable — exact dialogue delivery is hit-or-miss', 'asset/identity drift in I2V: products and faces can change from the reference', 'community-reported moderation unpredictability', 'preview snapshot: single image input only, behavior/pricing may shift when xAI GAs 1.5'], promptTechniques: ['keep prompts ~30-60 words and front-load: Aurora renders sequentially, so put subject + primary action in the first sentence', 'five-part structure: subject/action → explicit camera move → atmosphere/lighting → audio direction → preservation language (for I2V identity)', 'always name a camera move (slow push-in, dolly, orbit, locked/static) — otherwise the model chooses for you', 'direct the audio in the prompt: add a "Sound:" section and put exact dialogue in quotes', 'for I2V the first frame is the biggest quality lever — keep the motion prompt short', 'one action beat per clip; chain extensions for longer narratives'], communityInsights: ['launch buzz heavy on X given the xAI integration; clips posted within an hour of Musk\'s wide-release post', '#1 debut on I2V Arena — Elo figures conflict across sources (1473 vs ~1330), treat specific numbers as unverified', 'Reddit split on scale of improvement — some found 1.5\'s internal scene cuts cinematic, others preferred 1.0\'s continuous single-take style', 'unverified single source: HappyHorse handles optical physics and spatial mirroring better in stress tests'], costEfficiency: 'kie.ai published: 1.6 cr/s (~$0.008) at 480p, 3 cr/s (~$0.015) at 720p — audio included. Max 15s 720p clip = 45 cr (~$0.23). xAI direct is $0.08/s (480p) / $0.14/s (720p), so the kie route is dramatically cheaper. Cheapest with-audio video model in this registry. Budget for retries — cost per accepted clip exceeds list rates once moderation retries are counted.', comparedTo: { 'grok-imagine/text-to-video': 'Same 3 cr/s at 720p but a real upgrade: Aurora engine, 1-15s flexible duration, far more natural single-pass audio, ~40% faster. Physics weakness carries over. Use 1.5 unless you need the old fixed 6s/10s quality modes.', 'veo-3-fast/text-to-video': 'Veo wins on prompt adherence and 1080p+ paths at 7x the price; Grok 1.5 beat Veo 3.1 in blind I2V arena testing.', 'kling/v3-turbo-text-to-video': 'Kling Turbo offers 1080p, multi-shot, and stronger lip-sync at 6-7x the cost; Grok 1.5 wins on price and speed.', 'bytedance/seedance-2-mini': 'Seedance Mini has the multimodal ref stack and 480p draft tier at 9.5 cr/s; Grok 1.5 at 1.6 cr/s (480p) is ~6x cheaper still, with weaker control.' }, lastResearched: '2026-07-02', sources: ['https://docs.kie.ai/market/grok-imagine/1-5-preview', 'https://kie.ai/grok-imagine-video-1.5', 'https://evolink.ai/blog/grok-imagine-video-1-5-preview-review', 'https://familypro.io/en/blog/grok-imagine-video-15-vs-10', 'https://the-decoder.com/xai-updates-grok-imagine-to-1-5-with-image-to-video-generation-at-720p-resolution/'] },
    type: 'market',
    apiModel: 'grok-imagine-video-1-5-preview',
    maxPromptChars: 4096,
    // Probed 2026-07-02: createTask returns "This field is required" unless image_urls
    // has at least one entry — the preview snapshot is I2V-only even though the docs
    // schema marks image_urls as nullable (T2V presumably arrives with the GA release).
    requiresImage: true,
    aspectRatios: ['1:1', '16:9', '9:16', '3:2', '2:3', 'auto'],
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 8, description: 'Duration in seconds (1-15)' },
      resolution: { type: 'string', enum: ['480p', '720p'], default: '720p', description: '480p is ~half price — use for drafts' },
      nsfw_checker: { type: 'boolean', default: true, description: 'Content filtering (set false to disable kie-side filtering)' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio || 'auto', duration: opts.duration || 8, resolution: opts.resolution || '720p', image_urls: imageUrls.slice(0, 1) };
      if (opts.nsfw_checker === false) input.nsfw_checker = false;
      return input;
    },
  },
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
      return { prompt, aspect_ratio: aspectRatio, duration: String(opts.duration || '6'), resolution: opts.resolution || '480p', mode: opts.mode || 'normal' };
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
      return { prompt, image_urls: imageUrls, duration: String(opts.duration || '6'), resolution: opts.resolution || '480p', mode: opts.mode || 'normal' };
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

  // ── PixVerse V6 (NEW March 2026 — AISphere's budget all-rounder; added July 2026) ──
  'pixverse-v6/text-to-video': {
    name: 'PixVerse V6 T2V',
    description: 'NEW — PixVerse V6 text-to-video: native audio in-pass, 1-15s, up to 1080p, 8 aspect ratios, multi-clip mode. Budget tier (7.2 cr/s @720p no-audio). Note: I2V is its stronger modality.',
    capabilities: ['animation', 'audio', 'anime', 'multi-shot', 'budget', 'latest', 'new'],
    research: { verdict: 'PixVerse V6 (released March 30, 2026 by AISphere) is the budget all-rounder of the lineup: native audio in the same pass, single-pass 15-second 1080p, extensive camera controls, and the widest endpoint surface (transition, 7-image Fusion refs, chainable extend) at 4.0-9.6 cr/s. On Artificial Analysis it sits ~Elo 1330, roughly 4th in I2V-no-audio (tied with Grok 1.5 preview) but does NOT crack the T2V top 10 — it is clearly an I2V-first model. Physical realism and complex action lag Seedance 2.0 and Kling 3.0; where it wins is speed (30-60s renders), character consistency via Fusion, per-second billing at any 1-15s duration, and workflow breadth for the price. Right default for social-first, anime/stylized, and character-driven content where iteration volume matters more than the cinematic ceiling.', bestFor: ['fast social-first vertical video (9:16, 21:9) with 30-60s renders', 'anime/stylized content — often cleaner than realistic mode', 'explicit camera direction: dolly, crane, orbit, tracking with adjustable speed', 'cheap iteration volume — per-second billing at any 1-15s duration'], weaknesses: ['T2V is measurably weaker than I2V — absent from the AA T2V top-10 (prefer pixverse-v6/image-to-video with a strong source frame)', 'physical realism and complex action lag Seedance 2.0 and Kling 3.0', 'audio-to-lip-sync unreliable in multi-character scenes (documented voice-casting mismatches)', '1080p ceiling', 'character drift with very complex characters or rapid movement'], promptTechniques: ['V6 reads prompts literally — describe what is visible AND audible: subject, action, camera path, lighting, dialogue, SFX', 'put the core action in the first sentence', 'delete the word "cinematic" — name the specific look instead', 'one camera movement per prompt', 'multi-shot: use "CUT TO:" cues and keep character descriptions verbatim-consistent across shots'], communityInsights: ['massive consumer base: 100M registered users, 16M MAU as of March 2026 (single-source)', 'PixVerse V5.6 previously ranked #2 on the AA leaderboard — the family has a track record near the top', 'community three-way tests: Seedance 2 "is a killer" for action; PixVerse "nails it pretty good" for simple realism but falls short on complex/action scenes', 'unverified single source: fine camera controls take 6+ hours to dial in'], costEfficiency: 'kie published (per second): 360p 4.0/5.6 (no-audio/audio), 540p 5.6/7.2, 720p 7.2/9.6, 1080p 14.4/18.4. Table prices the 720p no-audio default (7.2 cr/s). Half the price of kling/v2-5-turbo, under seedance-2-mini; grok 1.5 (1.6-3 cr/s) stays the absolute cheapest audio option.', comparedTo: { 'grok-imagine-video-1-5-preview': 'Statistically tied on I2V-no-audio Elo (~1330) but Grok is roughly half the price; Grok wins pure cost-per-quality, PixVerse wins workflow breadth (transition, Fusion, extend, camera controls) and T2V capability at all (Grok preview is I2V-only).', 'bytedance/seedance-2-mini': 'Seedance is the action/motion winner with richer multimodal refs; Mini is 9.5 cr/s at just 480p — PixVerse gives 720p+audio around the same spend.', 'kling/v2-5-turbo-text-to-video': 'Kling has the higher cinematic ceiling but 2x the cost on kie and no native audio at that tier.' }, lastResearched: '2026-07-27', sources: ['https://pixverse.ai/en/blog/pixverse-launches-v6-advancing-ai-video-generation', 'https://artificialanalysis.ai/video/leaderboard/image-to-video', 'https://www.atlascloud.ai/blog/guides/pixverse-v6-review', 'https://influencerstudio.com/blog/post/pixverse6-vs-seedance2-kling3', 'https://kie.ai/pixverse-v6'] },
    type: 'market',
    apiModel: 'pixverse-v6/text-to-video',
    maxPromptChars: 5000,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '2:3', '3:2', '21:9'],
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 5, description: 'Duration in seconds (1-15)' },
      quality: { type: 'string', enum: ['360p', '540p', '720p', '1080p'], default: '720p', description: '360p is ~half price; 1080p is 2x' },
      generate_audio_switch: { type: 'boolean', default: false, description: 'Co-generate synchronized audio (raises the per-second rate ~33%)' },
      generate_multi_clip_switch: { type: 'boolean', default: false, description: 'Multi-clip video with camera cuts' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      const input = { prompt, aspect_ratio: aspectRatio || '16:9', quality: opts.quality || '720p', duration: opts.duration || 5 };
      if (opts.generate_audio_switch) input.generate_audio_switch = true;
      if (opts.generate_multi_clip_switch) input.generate_multi_clip_switch = true;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'pixverse-v6/image-to-video': {
    name: 'PixVerse V6 I2V',
    description: 'PixVerse V6 image-to-video — its STRONGEST modality (~Elo 1330, top-4 I2V-no-audio on Arena). Up to 2 images, viral effect templates via template_id, native audio.',
    capabilities: ['animation', 'image-to-video', 'audio', 'anime', 'budget', 'latest', 'new'],
    research: { verdict: 'The strongest PixVerse modality — ~Elo 1330, ~4th place I2V-no-audio on the Artificial Analysis arena (behind Gemini Omni Flash and Seedance 2.0, tied with Grok 1.5 preview). Accepts up to 2 images and a template_id for PixVerse\'s viral consumer effect templates (dances, product-in-fluffy-factory, birthday memes — preview any at https://static.aiquickdraw.com/tools/example/<template_id>.mp4). When template_id is set, duration is fixed by the template. Fast renders and per-second billing make it the iteration workhorse of the family.', bestFor: ['image-to-video animation on a budget — the family\'s benchmarked strength', 'viral/social effect templates (TikTok-style dances, product memes) via template_id', 'animating stylized/anime stills', 'quick product-shot animation with in-pass audio'], weaknesses: ['complex action still lags Seedance/Kling', 'template_id fixes duration (do not pass duration with it)', 'max 2 input images ≤20MB each', 'lip-sync casting unreliable with multiple characters'], promptTechniques: ['describe motion and audio, not the image content', 'templates: pass template_id and exactly the number of images its effect_type requires', 'keep the motion prompt short when the source image is strong'], communityInsights: ['the template system is the consumer-app viral engine, exposed via API — unusual among kie models', 'community: I2V clearly ahead of T2V for this family'], costEfficiency: 'Same published tiers as T2V: 720p no-audio default = 7.2 cr/s.', comparedTo: { 'grok-imagine-video-1-5-preview': 'Tied on Arena Elo; Grok is cheaper, PixVerse adds templates, 2-image input, and 1080p.', 'wan/flash-image-to-video': 'Wan Flash (~6 cr/s measured, #69) is comparable on price without audio; PixVerse adds audio and templates.' }, lastResearched: '2026-07-27', sources: ['https://artificialanalysis.ai/video/leaderboard/image-to-video', 'https://www.atlascloud.ai/blog/guides/pixverse-v6-review', 'https://kie.ai/pixverse-v6'] },
    type: 'market',
    apiModel: 'pixverse-v6/image-to-video',
    maxPromptChars: 5000,
    requiresImage: true,
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 5, description: 'Duration 1-15s. Do NOT set together with template_id (template fixes duration)' },
      quality: { type: 'string', enum: ['360p', '540p', '720p', '1080p'], default: '720p' },
      generate_audio_switch: { type: 'boolean', default: false },
      generate_multi_clip_switch: { type: 'boolean', default: false },
      template_id: { type: 'string', description: 'PixVerse viral effect template ID (preview: https://static.aiquickdraw.com/tools/example/<id>.mp4). Fixes duration; upload the number of images the template\'s effect_type requires' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, image_urls: imageUrls.slice(0, 2), quality: opts.quality || '720p' };
      if (opts.template_id) input.template_id = opts.template_id;
      else input.duration = opts.duration || 5;
      if (opts.generate_audio_switch) input.generate_audio_switch = true;
      if (opts.generate_multi_clip_switch) input.generate_multi_clip_switch = true;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'pixverse-v6/transition': {
    name: 'PixVerse V6 Transition',
    description: 'PixVerse V6 first→last frame morphing: give a start image + end image + a prompt describing how the transition unfolds. 1-15s, optional audio. No direct equivalent elsewhere in the registry.',
    capabilities: ['animation', 'transition', 'image-to-video', 'audio', 'budget', 'latest', 'new'],
    research: { verdict: 'First/last-frame morphing endpoint: a required start image, an end image, and a prompt describing how the transition unfolds — marketed for fashion changes, transformation effects, storytelling beats, and music-video cuts. Nothing else in the registry does exactly this as a dedicated endpoint (Seedance takes first+last frames but as generation constraints, not a morph brief). Same 1-15s / 360p-1080p / optional-audio envelope as the rest of V6.', bestFor: ['transformation effects (outfit/character/product morphs)', 'music-video beat transitions', 'before/after product reveals', 'storytelling scene-to-scene bridges'], weaknesses: ['morph quality depends heavily on structural similarity between the two frames', 'inherits V6\'s action-realism limits', 'no aspect_ratio control — follows the input frames'], promptTechniques: ['describe the JOURNEY between the frames, not the endpoints ("the dress dissolves into rose petals that reassemble as armor")', 'use structurally similar start/end frames for smooth morphs', 'specify pacing: where the transformation peaks within the duration'], communityInsights: ['marketed heavily for fashion and transformation content on the consumer app'], costEfficiency: 'Same published tiers as T2V: 720p no-audio default = 7.2 cr/s.', comparedTo: { 'bytedance/seedance-2-mini': 'Seedance first_frame_url+last_frame_url constrains a generation; PixVerse transition is a dedicated morph with a transition brief — better for explicit transformations.' }, lastResearched: '2026-07-27', sources: ['https://wavespeed.ai/models/pixverse/pixverse-v6/transition', 'https://kie.ai/pixverse-v6'] },
    type: 'market',
    apiModel: 'pixverse-v6/transition',
    maxPromptChars: 5000,
    requiresImage: true,
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 5 },
      quality: { type: 'string', enum: ['360p', '540p', '720p', '1080p'], default: '720p' },
      generate_audio_switch: { type: 'boolean', default: false },
      last_frame_image_url: { type: 'string', description: 'Last frame image URL (first frame comes from image_urls[0]; if image_urls has 2, the second is used as last frame unless this is set)' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { prompt, first_frame_image_url: imageUrls[0], quality: opts.quality || '720p', duration: opts.duration || 5 };
      const last = opts.last_frame_image_url || imageUrls[1];
      if (last) input.last_frame_image_url = last;
      if (opts.generate_audio_switch) input.generate_audio_switch = true;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'pixverse-v6/reference-to-video': {
    name: 'PixVerse V6 Fusion (R2V)',
    description: 'PixVerse Fusion — up to 7 typed reference images (subject/background) addressed as @ref_name in the prompt. The family\'s character-consistency differentiator. Priciest V6 endpoint (8.1 cr/s @720p).',
    capabilities: ['animation', 'character', 'multi-reference', 'audio', 'budget', 'latest', 'new'],
    research: { verdict: 'PixVerse calls this Fusion: composes up to 7 reference images — isolated subjects plus clean backgrounds, each with a type (subject|background) and a ref_name you address in the prompt as @ref_name — into a coherent generated scene, locking facial features and outfits across shots. The fix for V5-era character drift and the differentiator for e-commerce, brand, and narrative character work. Distinct addressing style from HappyHorse 1.1\'s [Image N]: named, typed refs. ~12% pricier than the other V6 endpoints.', bestFor: ['character-consistent series with named refs (@hero, @sidekick)', 'e-commerce: product refs composited into scenes', 'subject+background composition control', 'brand work needing locked outfits/faces across shots'], weaknesses: ['refs must be high-res with subjects clearly isolated — messy refs degrade output', 'max 7 refs, images only (Seedance takes video+audio refs)', 'complex multi-character interaction still drifts'], promptTechniques: ['address refs by name: "@dog runs through @room chasing a ball"', 'ref_name ≤30 chars, unique per request', 'separate clean background images from subject images and type them correctly', 'high-res isolated-subject refs give dramatically better results'], communityInsights: ['Fusion is the community-cited fix for the V5 character-drift complaints'], costEfficiency: 'kie published: 360p 4.5/6.3, 540p 6.3/8.1, 720p 8.1/10.8, 1080p 16.2/20.7 (no-audio/audio, per second). Table prices 720p no-audio (8.1 cr/s). Cheaper than HappyHorse 1.1 R2V (22.5-29 cr/s) for image-ref work if the quality ceiling suffices.', comparedTo: { 'happyhorse-1-1/reference-to-video': 'HappyHorse has the higher with-audio Arena pedigree and 9 refs; PixVerse Fusion is ~a third the price with typed @name addressing.', 'bytedance/seedance-2-mini': 'Seedance refs span images+video+audio; Fusion is images-only but named/typed and cheaper at 720p.' }, lastResearched: '2026-07-27', sources: ['https://docs.platform.pixverse.ai/how-to-use-fusionreference-to-video-1339253m0', 'https://kie.ai/pixverse-v6'] },
    type: 'market',
    apiModel: 'pixverse-v6/reference-to-video',
    maxPromptChars: 5000,
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '2:3', '3:2', '21:9'],
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 5 },
      quality: { type: 'string', enum: ['360p', '540p', '720p', '1080p'], default: '720p' },
      generate_audio_switch: { type: 'boolean', default: false },
      image_references: { type: 'array', description: 'REQUIRED: up to 7 refs as [{image_url, type: "subject"|"background", ref_name}] — address each in the prompt as @ref_name' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      // Accept structured image_references, or build subject refs from plain image_urls (@ref1, @ref2, ...)
      const refs = opts.image_references || (imageUrls || []).slice(0, 7).map((u, i) => ({ image_url: u, type: 'subject', ref_name: `ref${i + 1}` }));
      const input = { prompt, image_references: refs, aspect_ratio: aspectRatio || '16:9', quality: opts.quality || '720p', duration: opts.duration || 5 };
      if (opts.generate_audio_switch) input.generate_audio_switch = true;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'pixverse-v6/extend': {
    name: 'PixVerse V6 Extend',
    description: 'PixVerse V6 video extend — continues an existing video (by kie taskId of a prior PixVerse success, or a video_url) so it "looks like the original kept rolling". Chainable, 1-15s per pass. Seedance/Kling lack a native equivalent.',
    capabilities: ['video-extend', 'editing', 'audio', 'budget', 'latest', 'new'],
    research: { verdict: 'Analyzes the ending segment of an existing video (motion trajectories, lighting, style, composition) and continues it. Each pass adds 1-15s with prompt control and optional audio; passes chain with no documented limit — a 15s base plus three extends yields a minute of continuous footage, the cheapest path to 30-60s among the budget models. Takes EITHER the taskId of a prior successful kie PixVerse task OR a video_url (mutually exclusive; kie does not accept official PixVerse video_ids).', bestFor: ['long-form assembly on a budget: 15s base + chained extends', 'continuing a shot past another model\'s duration cap', 'extending user-provided footage (video_url) with matched style'], weaknesses: ['taskId and video_url are mutually exclusive — exactly one', 'parent task must be a successful, undeleted kie task owned by you', 'extensions can repeat or contradict source footage — steer with an explicit prompt', 'style match degrades over many chained passes'], promptTechniques: ['be specific about what happens NEXT (camera movement, subject action, environment change)', 'reference the source\'s motion: "continue the same camera motion and extend the scene naturally"'], communityInsights: ['flagged by reviewers as a capability Seedance 2.0 and Kling 3.0 lack natively'], costEfficiency: 'Same published tiers as T2V: 720p no-audio default = 7.2 cr/s per extended second.', comparedTo: { 'runway/extend': 'Runway extends Runway outputs at 6 cr/s; PixVerse extends its own tasks AND arbitrary video_urls.', 'veo/extend': 'Veo extend is 31.25 cr/s and Veo-only; PixVerse is ~4x cheaper and takes external URLs.' }, lastResearched: '2026-07-27', sources: ['https://docs.platform.pixverse.ai/how-to-use-extend-1268531m0', 'https://wavespeed.ai/models/pixverse/pixverse-v6/extend', 'https://kie.ai/pixverse-v6'] },
    type: 'market',
    apiModel: 'pixverse-v6/extend',
    maxPromptChars: 5000,
    options: {
      duration: { type: 'number', min: 1, max: 15, default: 5, description: 'Seconds to ADD' },
      quality: { type: 'string', enum: ['360p', '540p', '720p', '1080p'], default: '720p' },
      generate_audio_switch: { type: 'boolean', default: false },
      task_id: { type: 'string', description: 'kie taskId of a prior successful PixVerse task to extend (mutually exclusive with video_url)' },
      video_url: { type: 'string', description: 'URL of a video to extend (mutually exclusive with task_id)' },
      seed: { type: 'number', min: 0, max: 2147483647 },
    },
    buildInput(prompt, _ar, _imgs, opts) {
      const input = { prompt, quality: opts.quality || '720p', duration: opts.duration || 5 };
      if (opts.task_id) input.taskId = opts.task_id;
      else if (opts.video_url) input.video_url = opts.video_url;
      if (opts.generate_audio_switch) input.generate_audio_switch = true;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },

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
  'omnihuman-1-5': {
    name: 'OmniHuman 1.5 (ByteDance)',
    description: 'NEW — ByteDance audio-driven avatar: image + audio (≤60s) → full-body emotion-matched performance. Multi-person via masks from omnihuman-1-5/subject-detection. Premium at 27 cr/s.',
    capabilities: ['avatar', 'lip-sync', 'character', 'animation', 'audio-driven', 'latest', 'new'],
    research: { verdict: 'ByteDance\'s second-generation audio-driven human animation model (paper arXiv:2508.19209) and the current reference point for "semantic" avatar performance: a dual-system design pairs an MLLM planner with a Multimodal DiT so gestures and expressions follow the MEANING and emotion of the audio rather than just its rhythm. Versus OmniHuman-1 it adds text-prompt control, emotion-aware expression, meaning-correlated gestures, multi-person scenes with per-character audio routing via masks, 720p/1080p selection, and a fast mode. It is a performance/full-body-acting model more than a raw lip-sync specialist — one head-to-head found Kling AI Avatar slightly sharper on phoneme-level lip articulation while OmniHuman-1.5 was more stable and identity-preserving. At 27 cr/s it is one of the priciest per-second models here — reserve for hero avatar shots, not bulk dubbing (use volcengine/video-to-video-lip-sync for that).', bestFor: ['talking/singing/performing avatars from a single image + audio where full-body, emotion-matched acting matters', 'multi-character dialogue: separate audio tracks routed to specific people via subject-detection masks (up to 5)', 'longer single-take performances (audio up to 60s; ~15s per clip recommended)', 'identity-stable, smooth performances over exaggerated cartoon expressiveness', 'stylized/non-photoreal subjects — people, pets, anime'], weaknesses: ['lip-sync phoneme precision slightly behind Kling AI Avatar in a published head-to-head', 'high-energy audio (shouting, laughter) can over-exaggerate mouth shapes or briefly distort faces', 'expensive: 27 cr/s means a 60s clip ≈ 1620 cr (~$8.10)', 'multi-person is not automatic — requires the subject-detection utility to generate masks first', 'audio capped at <60s and 10MB; quality degrades past ~15s', 'prompt limited to zh/en/ja/ko/es/id, ≤1000 chars'], promptTechniques: ['the audio IS the main prompt: the model reads semantic content and vocal emotion — use expressive, clean recordings', 'use the optional text prompt to direct actions, emotional tone, and camera movement', 'for multi-person images, run omnihuman-1-5/subject-detection first, then pass mask_url values so the correct subject speaks', 'iterate with pe_fast_mode=true and output_resolution "720", re-render finals at "1080"', 'keep audio to ~15s per clip; avoid heavy face occlusion in the source image', 'set seed for reproducible takes'], communityInsights: ['reviewers describe the jump from 1.0 as gestures correlating "with meaning, not audio energy"', 'unverified single-source head-to-head (piapi.ai): Kling Avatar wins raw lip-sync accuracy; OmniHuman 1.5 wins emotional transitions and identity preservation', 'Hedra now hosts OmniHuman 1.5 as a selectable engine — competitors treat it as best-in-class for the niche', 'HeyGen\'s Avatar V tech report claims beating OmniHuman-1.5 — vendor benchmark, treat as marketing'], costEfficiency: 'kie.ai published: 27 cr/s (~$0.135) — billed on output video length (= audio length). Official BytePlus is $0.16/s, so kie is ~15% under. ~3.4x the cost of volcengine lip-sync (8 cr/s) and ~2.7x Kling Avatar Pro (10 cr/s) — the premium buys full-body semantic acting. Control cost with 720p + pe_fast_mode + short audio.', comparedTo: { 'kling/ai-avatar-pro': 'Kling slightly sharper phoneme-level lip-sync with more dramatic dynamics at 10 cr/s; OmniHuman smoother, more identity-stable, stronger full-body semantic acting and multi-person masking.', 'infinitalk/from-audio': 'Infinitalk (4 cr/s) is the budget talking-head; OmniHuman is the premium full-body performer at ~7x the price.', 'volcengine/video-to-video-lip-sync': 'Different task: Volcengine re-syncs the mouth of EXISTING footage at 8 cr/s; OmniHuman generates a whole new performance from a still image.', 'wan/speech-to-video': 'Wan S2V (3 cr/s) is far cheaper but generic; OmniHuman leads on emotional nuance and gesture semantics.' }, lastResearched: '2026-07-02', sources: ['https://omnihuman-lab.github.io/v1_5/', 'https://arxiv.org/abs/2508.19209', 'https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman1_5overview', 'https://piapi.ai/blogs/omnihuman-1-5-vs-kling-ai-avatar', 'https://kie.ai/omnihuman-1-5'] },
    type: 'market',
    apiModel: 'omnihuman-1-5',
    maxPromptChars: 1000,
    requiresImage: true,
    options: {
      audio_url: { type: 'string', description: 'Audio URL to drive the avatar (<60s, ≤10MB; ~15s recommended). Required.' },
      mask_url: { type: 'array', description: 'Optional mask image URL(s) from omnihuman-1-5/subject-detection — selects which subject speaks (up to 5)' },
      output_resolution: { type: 'string', enum: ['720', '1080'], default: '1080' },
      pe_fast_mode: { type: 'boolean', default: false, description: 'Fast mode — sacrifices some quality for speed' },
      seed: { type: 'number', min: -1, max: 2147483647, description: '-1 = random; same positive seed reproduces results' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      const input = { image_url: imageUrls?.[0], audio_url: opts.audio_url, output_resolution: opts.output_resolution || '1080', pe_fast_mode: opts.pe_fast_mode || false };
      if (prompt) input.prompt = prompt;
      if (opts.mask_url) input.mask_url = opts.mask_url;
      if (opts.seed !== undefined) input.seed = opts.seed;
      return input;
    },
  },
  'volcengine/video-to-video-lip-sync': {
    name: 'Volcengine Video Lip-Sync (ByteDance)',
    description: 'NEW — re-syncs the mouth of EXISTING footage to new audio (dubbing/localization). Video 3-350s + pure-vocal audio. lite mode for frontal talking heads, basic for complex scenes. 8 cr/s.',
    capabilities: ['lip-sync', 'video-to-video', 'editing', 'dubbing', 'latest', 'new'],
    research: { verdict: 'Volcengine\'s 视频改口型 (Video Lip-Sync Reshaping) API from ByteDance\'s Intelligent Vision Service. Takes an existing single-person video plus a new pure-vocal audio file (audio only — no TTS-text input; chain generate_tts first) and re-renders the mouth region to match, preserving the original performance. Two tiers: "lite" for frontal talking-head footage (faster) and "basic" for single speakers in complex scenes with scene segmentation and speaker ID. Specs are well documented (3-350s video, 360p-1080p, strict face-angle limits) but independent quality benchmarks are essentially nonexistent in English — quality claims come from kie\'s marketing. Structurally a dubbing/localization tool, not an avatar generator: it only edits the mouth. Test on your own footage before committing.', bestFor: ['video dubbing/localization: re-syncing existing talking-head footage to translated or replacement audio without reshooting', 'long-form content — up to 350s input video and 240s driving audio per job (far beyond short avatar clips)', 'e-learning, corporate training, and creator content repurposed into other languages', 'Asian/tonal-language dubbing (Mandarin, JA, KO, Vietnamese, Bahasa) — claimed strength (vendor claim)', 'pipeline use: pair with generate_tts for text-driven dubbing'], weaknesses: ['single-person videos only; basic mode adds speaker ID but still targets one speaker', 'strict face-angle limits: yaw ≤30°, pitch ≤15°, roll ≤20°, hard fail beyond ±45° — profile shots and action footage will fail', 'no TTS/text input — must supply finished audio (≤10MB)', 'output is fixed MP4 at 25 fps regardless of source frame rate', 'output duration follows the audio, trimming or looping the video — long audio over short video makes awkward loops', 'zero independent quality reviews found — all claims are vendor marketing'], promptTechniques: ['no prompt — inputs are video_url + audio_url via model_options', 'shoot/select frontal single-speaker footage; keep head yaw under ~30°', 'feed clean vocals-only audio; if the track has music/noise set separate_vocal: true', 'use "basic" mode with open_scenedet for multi-shot videos so it segments scenes and finds the speaker', 'prep video to spec: MP4/MOV, H.264, 360p-1080p, 24-60 fps, ≤500MB, 3-350s', 'use align_audio (+align_audio_reverse for ping-pong) when audio outruns the video; templ_start_seconds picks where the template starts'], communityInsights: ['no meaningful English-language community discussion found as of 2026-07 — reception effectively undocumented outside vendor pages', 'kie case studies (university dubbing 200+ hrs of lectures at 70% cost reduction) are vendor marketing anecdotes', 'on Volcengine directly the concurrency limit is 1 request/account; kie claims higher but unverified'], costEfficiency: 'kie.ai published: 8 cr/s (~$0.04, ~$2.40/min) of generated video, mirroring Volcengine\'s direct China price (0.3 CNY/s). ~3.4x cheaper than OmniHuman 1.5 per second and comparable to sync.so Lipsync 2.0 Pro. Billing follows audio duration — a 4-minute dub ≈ 1920 cr (~$9.60).', comparedTo: { 'omnihuman-1-5': 'Different task: OmniHuman generates a new animated performance from a still image at 27 cr/s; Volcengine only edits the mouth of existing real footage at 8 cr/s — better for dubbing authenticity, useless for creating new footage.', 'kling/ai-avatar-pro': 'Kling Avatar is image-to-avatar-video; it does not re-sync your existing video. Community reports cite ~10s limits on Kling\'s lip-sync feature vs Volcengine\'s 350s input.', 'sora/watermark-remover': 'Unrelated but a reminder: this section of the registry is utility-shaped — Volcengine is production plumbing, not a creative model.' }, lastResearched: '2026-07-02', sources: ['https://kie.ai/volcengine-video-to-video-lip-sync', 'https://docs.kie.ai/market/volcengine/video-to-video-lip-sync', 'https://www.volcengine.com/docs/85128/1465367', 'https://fal.ai/models/fal-ai/sync-lipsync'] },
    type: 'market',
    apiModel: 'volcengine/video-to-video-lip-sync',
    options: {
      video_url: { type: 'string', description: 'Video to re-sync (MP4/MOV, H.264, 360p-1080p, 3-350s, ≤500MB). Required.' },
      audio_url: { type: 'string', description: 'Pure vocal audio URL driving the lip movements (≤10MB). Required.' },
      mode: { type: 'string', enum: ['lite', 'basic'], default: 'lite', description: 'lite = single-person frontal (faster); basic = complex scenes with scene segmentation + speaker ID' },
      separate_vocal: { type: 'boolean', default: false, description: 'Run vocal separation to suppress background noise in the audio' },
      open_scenedet: { type: 'boolean', default: false, description: 'Scene segmentation + speaker identification (basic mode only)' },
      align_audio: { type: 'boolean', default: true, description: 'Loop the video when audio is longer than the video (lite mode)' },
      align_audio_reverse: { type: 'boolean', default: false, description: 'Loop the video in reverse/ping-pong (lite mode, requires align_audio)' },
      templ_start_seconds: { type: 'number', min: 0, description: 'Start time within the template video, in seconds (lite mode)' },
    },
    buildInput(_prompt, _ar, _imgs, opts) {
      const input = { mode: opts.mode || 'lite', video_url: opts.video_url, audio_url: opts.audio_url };
      if (opts.separate_vocal) input.separate_vocal = true;
      if (opts.open_scenedet) input.open_scenedet = true;
      if (opts.align_audio !== undefined) input.align_audio = opts.align_audio;
      if (opts.align_audio_reverse) input.align_audio_reverse = true;
      if (opts.templ_start_seconds !== undefined) input.templ_start_seconds = opts.templ_start_seconds;
      return input;
    },
  },
  'happyhorse/text-to-video': {
    name: 'HappyHorse 1.0 T2V',
    description: 'Alibaba flagship — #1 on Artificial Analysis Arena T2V (Elo 1389, +118 over Seedance 2.0). 15B params, open-source, by Zhang Di (former Kling architect).',
    capabilities: ['cinematic', 'animation', 'audio', 'latest', 'new', 'open-source', 'alibaba'],
    research: { verdict: 'Alibaba ATH/Taotian Future Life Lab\'s flagship. Led by Zhang Di — former Kling architect at Kuaishou who rejoined Alibaba late 2025 and shipped this within months. Hit #1 on Artificial Analysis Arena April 7, 2026 with T2V Elo 1389 (vs Seedance 2.0 at 1271 — leading by ~118 points, ~58% blind-test win rate). Open-source 15B params. The key trade-off: HappyHorse wins on visual quality and motion; Seedance 2.0 wins on audio-enabled generation (1219 vs 1205 ELO). Strong at cinematic camera moves and physical specificity. Weak at text rendering (42/100) and complex hand articulation (68% close-up accuracy).', bestFor: ['cinematic single-shot generation where visual quality matters most', 'camera-centric shots (dolly, orbit, push-in, crash zoom)', 'physically specific subjects with clear actions', 'open-source workflows requiring weights access', '5-second narrative beats with stable camera'], weaknesses: ['text rendering 42/100 — useless for posters, signs, UI', 'hand articulation 68% in close-ups (87% full body)', 'performance degrades 12% at extreme aspect ratios (21:9, 9:16)', 'quality collapses after ~5s in some reports — turns cartoonish', 'compressed latent colorspace limits post-production grading', 'pseudo-deterministic — iterative refinement unreliable', 'audio quality narrowly behind Seedance 2.0', 'no multimodal reference inputs (no audio/video refs like Seedance 2.0)'], promptTechniques: ['~20 word sweet spot — Subject + Action + Setting + 1 camera cue', 'physical specificity wins: "tall man in his 40s with grey beard, worn leather jacket" not "a man"', 'use precise visible movement, not emotional states', 'place camera cues at END of prompt — gets most weight', 'use filmmaking terms: dolly push, whip-pan, crash zoom, snap focus', 'better detail, not more detail — every word competes for attention', 'if it can\'t be photographed, don\'t write it', 'create permanent character profiles for cross-scene consistency'], communityInsights: ['Alibaba revealed as creator April 10, 2026 (CNBC)', 'corroborated across multiple sources: leads Seedance on visual quality, loses to Seedance on audio', 'fal.ai launched as official API partner April 26 — model is real and accessible', 'open-source weights drop expected — community deployment guides already published', 'multiple independent reviews (Atlas Cloud, Pollo AI, fal.ai, Apiyi) confirm benchmark numbers', 'first model to combine open-source + native joint audio-video generation'], costEfficiency: 'kie.ai published (confirmed 2026-07-12): 28 cr/s @720p, 48 cr/s @1080p (default) — pricier than first thought (was estimated 8 cr/s). For pure visual quality at 1080p it competes with Veo/Kling tiers rather than undercutting them.', comparedTo: { 'seedance-2/text-to-video': 'HappyHorse +118 ELO on visual T2V; Seedance +14 ELO on audio T2V. HappyHorse for visual quality, Seedance for synced audio and multimodal references (9 imgs + 3 vids + 3 audio).', 'veo-3/text-to-video': 'Veo retains 4K-only path and superior cinematic color grading. HappyHorse beats Veo on raw ELO at 1080p but lacks Veo\'s post-production flexibility.', 'kling-3/video': 'Kling 3.0 has multi-shot capability HappyHorse lacks. HappyHorse wins single-shot quality. Note: same architect (Zhang Di) built both.', 'wan/2-7-text-to-video': 'Wan 2.7 has video editing and reference-to-video features HappyHorse 1.0 lacks. HappyHorse wins ELO; Wan wins workflow flexibility.' }, lastResearched: '2026-05-05', sources: ['https://www.cnbc.com/2026/04/10/alibaba-happyhorse-ai-video-model-benchmark-reveal.html', 'https://artificialanalysis.ai/video/leaderboard/text-to-video', 'https://help.apiyi.com/en/happy-horse-1-vs-seedance-2-video-ai-comparison-en.html', 'https://fal.ai/happyhorse-1.0', 'https://wavespeed.ai/blog/posts/what-is-happyhorse-1-0-ai-video-model/', 'https://www.glbgpt.com/resources/happy-horse-1-0-prompt-guide/'] },
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
    research: { verdict: 'I2V counterpart leads Arena leaderboard with Elo 1416 vs Seedance 2.0 at 1351 — ~65 ELO advantage. Same Alibaba/Zhang Di provenance as T2V. The image anchoring helps mitigate HappyHorse\'s text-rendering and hand-articulation weaknesses by giving the model a fixed visual reference. Strongest single-image-to-video quality available currently for cinematic content. Same audio-quality gap behind Seedance 2.0.', bestFor: ['animating product photography with cinematic motion', 'hero image animation for ads and brand content', 'animating concept art and illustrations', 'character animation from a clean reference photo', 'physical product demos with subtle camera movement'], weaknesses: ['no multi-reference support (single image only)', 'inherits T2V color grading constraints', 'rapid action from static images shows motion blur after ~4 m/s', 'audio narrowly behind Seedance 2.0', 'cannot maintain identity across longer cuts without explicit prompting'], promptTechniques: ['describe MOTION not visual content (image provides that)', '~20 word target as with T2V', 'specify camera movement explicitly: "slow dolly-in", "orbit clockwise 30 degrees"', 'state what should NOT move', 'for products: describe environmental light changes', 'high-resolution sharp source images give dramatically better results'], communityInsights: ['I2V leads T2V in arena ranking — image anchoring helps overall quality', 'same prompting principles as T2V: physical specificity, camera language at end', 'fal.ai/kie.ai both offer it — open-source means more providers coming'], costEfficiency: 'Same published rates as T2V: 28 cr/s @720p, 48 @1080p (default).', comparedTo: { 'seedance-2/text-to-video': 'HappyHorse +65 ELO on I2V. Seedance has multi-reference (9 images, 3 videos, 3 audio) for richer compositional control. HappyHorse for pure quality, Seedance for production complexity.', 'veo-3/image-to-video': 'Veo offers 4K and 3-image "Ingredients" system. HappyHorse has higher 1080p ELO but no equivalent multi-ref system.', 'kling/image-to-video': 'Kling has native audio at 2.6+. HappyHorse has higher visual ELO but Kling has the workflow ecosystem.' }, lastResearched: '2026-05-05', sources: ['https://artificialanalysis.ai/video/leaderboard/image-to-video', 'https://help.apiyi.com/en/happy-horse-1-vs-seedance-2-video-ai-comparison-en.html', 'https://fal.ai/happyhorse-1.0'] },
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
    research: { verdict: 'HappyHorse\'s answer to Seedance 2.0\'s multimodal control. Accepts 1-9 reference images for character, style, and composition consistency. Note: still images only — Seedance 2.0 also accepts video and audio references which HappyHorse R2V does not. For pure visual character consistency at 1080p, HappyHorse leads. For full multimodal direction (video motion refs, audio sync refs), Seedance 2.0 still wins.', bestFor: ['character-consistent series with multiple reference angles', 'product placement with style + composition refs', 'art style transfer with multiple visual references', 'cinematic mood pieces using 5-9 reference moodboard images'], weaknesses: ['only image references — no video or audio refs', 'inherits same text rendering and hand limitations', 'no documented limit on quality at 9 refs vs 3 refs — likely diminishing returns'], promptTechniques: ['describe relationships between references explicitly', 'provide reference images at consistent lighting/style for best results', 'use 3-5 references as sweet spot before diminishing returns', 'reference camera angles, character profiles, and style anchors separately'], communityInsights: ['unverified community report: 9-image limit produces noticeable returns up to ~5 refs then plateaus', 'use case overlap with Wan 2.7 R2V — HappyHorse wins ELO, Wan has broader workflow'], costEfficiency: 'Same published rates as T2V: 28 cr/s @720p, 48 @1080p (default). Comparable to Seedance 2.0 (25 cr/s) rather than a discount.', comparedTo: { 'seedance-2/text-to-video': 'Seedance accepts 9 images + 3 videos + 3 audio refs. HappyHorse R2V accepts only 9 images. For pure image-ref work HappyHorse wins ELO; for full multimodal Seedance is the only option.', 'wan/2-7-reference-to-video': 'Both target same use case. HappyHorse wins ELO; Wan has broader Wan 2.7 ecosystem (T2V/I2V/edit/r2v all in one family).' }, lastResearched: '2026-05-05', sources: ['https://fal.ai/happyhorse-1.0', 'https://artificialanalysis.ai/video/leaderboard/text-to-video'] },
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
    research: { verdict: 'HappyHorse video editing variant. Inherits the strong visual quality from T2V/I2V but applied to existing video as input. Supports up to 5 reference images for guided edits. Audio handling has two modes: auto (regenerate) or origin (preserve source audio). Less mature than Wan 2.7 Video Edit which has been refined longer, but HappyHorse\'s underlying visual ELO advantage suggests stronger editing quality once stable.', bestFor: ['style transfer on existing videos', 'product video relighting and grading', 'video upscaling with style adjustments', 'subject swaps with reference image guidance'], weaknesses: ['newer than Wan 2.7 Video Edit — fewer documented edge cases', 'audio_setting auto mode may regenerate audio you wanted to preserve', 'cannot do surgical pixel-perfect edits like Flux Kontext (it\'s video, different category)'], promptTechniques: ['use audio_setting: "origin" to keep source audio', 'use audio_setting: "auto" to regenerate audio matching new visual', 'reference images guide style; describe target outcome explicitly', 'simpler edits work better — multi-element edits compound errors'], communityInsights: ['fewer independent reviews than T2V/I2V — quality less verified', 'unverified community report: works best on 1080p source videos'], costEfficiency: 'kie published: 28 cr/s @720p, 48 @1080p (default) — same tier as the other 1.0 endpoints, not the earlier 10 cr/s estimate.', comparedTo: { 'wan/2-7-video-edit': 'Wan 2.7 Video Edit is more mature and battle-tested. HappyHorse Video Edit has higher visual ELO advantage but fewer documented workflows.', 'runway/aleph-edit': 'Runway Aleph specializes in editing. HappyHorse is generalist — Runway better for specialized editing tasks.' }, lastResearched: '2026-05-05', sources: ['https://fal.ai/happyhorse-1.0', 'https://kie.ai/happyhorse-1-0'] },
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

  // ── HappyHorse 1.1 (NEW June 22, 2026 — production-focused successor to 1.0) ──
  'happyhorse-1-1/text-to-video': {
    name: 'HappyHorse 1.1 T2V',
    description: 'HappyHorse 1.1 — adds native synchronized audio with 7-language lip-sync, 9 aspect ratios, smoother motion. #2 with-audio on Arena (behind Seedance 2.0).',
    capabilities: ['cinematic', 'animation', 'audio', 'lip-sync', 'latest', 'new', 'alibaba'],
    research: { verdict: 'Released June 22-23, 2026 by Alibaba ATH/Taotian. A production-focused upgrade rather than a quality leap: keeps the 15B unified single-stream transformer of 1.0 but adds native synchronized audio with 7-language lip-sync (EN, Mandarin, Cantonese, JA, KO, DE, FR), 3-15s durations, and markedly smoother motion with stronger subject consistency. On Artificial Analysis (late June 2026) it ranks #2 with-audio in T2V (Elo ~1150) — beating HappyHorse 1.0 and Kling 3.0 Pro on audio tracks but trailing Seedance 2.0 (~1219) everywhere that matters. On no-audio T2V it sits a hair BELOW 1.0 (1285 vs 1290) — choose 1.1 for audio/dialogue work, not for a raw silent-quality bump. Note the April-2026 #1 Elos cited for 1.0 (1389) no longer reflect the board — Seedance 2.0 has since taken the crown.', bestFor: ['multilingual talking-head, presenter, and short-drama content via native 7-language lip-sync', 'short-form social ads where synchronized dialogue, ambience, music, and Foley in a single pass beats a separate dubbing pipeline', 'physics-plausible motion (cloth drag, water displacement) inherited and improved from 1.0', 'branded content requiring identity preservation without re-rendering per language'], weaknesses: ['resolution capped at 1080p — Kling 3.0 and Seedance 2.0 offer higher tiers', 'clips limited to 3-15 seconds', 'voice rendering in extended dialogue can sound slightly unnatural', 'no audio INPUT — cannot feed an existing voiceover to sync to (most-requested missing feature)', 'trails Seedance 2.0 on every Artificial Analysis category', 'does not beat its own 1.0 on no-audio T2V Elo', 'promised open-source weight release from the 1.0 era still has not shipped'], promptTechniques: ['write detailed multi-element prompts covering subject, action, environment, lighting, mood, camera AND audio direction — 1.1 holds complex prompts together where 1.0 dropped elements', 'specify dialogue language explicitly to trigger the correct lip-sync track', 'prompt limit 5,000 non-Chinese / 2,500 Chinese characters, any language', 'iterate at 720p for cost, finalize at 1080p', 'download results promptly — kie result URLs expire after 24h'], communityInsights: ['consensus across reviews: 1.1 fixed the sluggish/stuttery fast-motion feel of 1.0 and shifted the story from benchmark wins to production reliability', 'most-cited differentiator: 9-image multi-reference PLUS native multilingual audio in one pipeline — no direct competitor matches both', 'unverified community report: vendor-reported 14.60% lip-sync word error rate across supported languages', 'Alibaba paired the launch with a global HorsePower AI filmmaking competition (prizes up to RMB 1M)', '1.1-specific field reports still thin as of 2026-07 — release is ~10 days old'], costEfficiency: 'kie.ai published: 22.5 cr/s ($0.1125) at 720p, 29 cr/s ($0.145) at 1080p. ~2.5-3.6x the old 1.0 estimate — this is a premium tier now. Native audio+lip-sync eliminates separate TTS/dubbing spend; track cost-per-approved-clip given retry rates in complex scenes.', comparedTo: { 'happyhorse/text-to-video': '1.1 adds native audio, 7-language lip-sync, 3-15s durations, smoother motion. Beats 1.0 decisively on with-audio Elo (~1150 vs 1124) but sits marginally below on no-audio T2V — silent-clip quality is essentially unchanged.', 'seedance-2/text-to-video': 'Seedance 2.0 leads every AA category (with-audio T2V 1219 vs ~1150) and has richer refs (9 img + 3 vid + 3 audio). HappyHorse 1.1 counters with native multilingual lip-sync in one pass, which Seedance lacks.', 'kling-3/video': 'HappyHorse 1.1 out-Elos Kling 3.0 Pro on with-audio T2V (~1150 vs 1105); Kling counters with 4K, multi-shot, and mature tooling.', 'veo-3/text-to-video': 'Current boards put Veo 3.1 at ~1094 with-audio T2V — HappyHorse 1.1 leads by ~55 points; Veo retains 4K upscale paths and ecosystem.' }, lastResearched: '2026-07-02', sources: ['https://technode.com/2026/06/23/alibaba-unveils-happyhorse-1-1-video-generation-model-launches-global-ai-filmmaking-competition/', 'https://www.cometapi.com/what-is-happyhorse-1-1-benchmarks-use-cases-limits-advise/', 'https://artificialanalysis.ai/video/leaderboard/text-to-video', 'https://www.atlascloud.ai/models/alibaba/happyhorse-1.1/text-to-video', 'https://kie.ai/happyhorse-1-1'] },
    type: 'market',
    apiModel: 'happyhorse-1-1/text-to-video',
    maxPromptChars: 4999,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15)' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio || '16:9', duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
    },
  },
  'happyhorse-1-1/image-to-video': {
    name: 'HappyHorse 1.1 I2V',
    description: 'HappyHorse 1.1 I2V — animates a first-frame image with native audio. Biggest with-audio Elo jump of the family (+28 over 1.0, ~1117, #2 on Arena).',
    capabilities: ['cinematic', 'animation', 'image-to-video', 'audio', 'lip-sync', 'latest', 'new', 'alibaba'],
    research: { verdict: 'The I2V endpoint animates stills while preserving character identity, visual style, and scene detail; 1.1 specifically improves motion quality, skin-texture realism, text-rendering stability, and cross-shot consistency. Biggest with-audio Elo jump of any 1.1 endpoint (+28 over 1.0, ~1117 — #2 on Arena behind Seedance 2.0 at 1195). Best HappyHorse endpoint for product shots and talking-head/presenter content built from a keyframe. Single first-frame image only — use reference-to-video for multi-ref work.', bestFor: ['animating product photography with cinematic motion + native sound', 'talking-head/presenter content built from a keyframe', 'hero image animation for ads and brand content', 'animating concept art with identity preservation'], weaknesses: ['single image only — no multi-reference (use happyhorse-1-1/reference-to-video)', 'no aspect_ratio control — output follows the input image', 'image constraints: ≥300px sides, aspect between 1:2.5 and 2.5:1, ≤20MB', 'same 1080p/15s ceiling and no-audio-input limitation as T2V'], promptTechniques: ['describe MOTION and audio, not visual content (the image provides that)', 'specify camera movement explicitly: "slow dolly-in", "orbit clockwise 30 degrees"', 'state what should NOT move', 'high-resolution sharp source images give dramatically better results'], communityInsights: ['image anchoring mitigates the family\'s text-rendering and hand-articulation weaknesses', 'reviewers cite I2V as the strongest 1.1 endpoint for commercial work'], costEfficiency: 'Same published rates as T2V: 22.5 cr/s at 720p, 29 cr/s at 1080p.', comparedTo: { 'happyhorse/image-to-video': '1.1 adds native audio + lip-sync and smoother motion. Both 1.0 and 1.1 are premium-priced (1.0: 28/48 cr/s; 1.1: 22.5/29 cr/s) — 1.1 is actually CHEAPER per second.', 'seedance-2/text-to-video': 'Seedance with first_frame_url is the same I2V function with richer multimodal refs; HappyHorse 1.1 wins on native multilingual lip-sync.', 'kling/v3-turbo-image-to-video': 'Kling Turbo I2V is cheaper at 720p (18 cr/s) with multi-shot heritage; HappyHorse 1.1 has the higher with-audio Arena Elo.' }, lastResearched: '2026-07-02', sources: ['https://artificialanalysis.ai/video/leaderboard/image-to-video', 'https://www.cometapi.com/what-is-happyhorse-1-1-benchmarks-use-cases-limits-advise/', 'https://kie.ai/happyhorse-1-1'] },
    type: 'market',
    apiModel: 'happyhorse-1-1/image-to-video',
    maxPromptChars: 5000,
    requiresImage: true,
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15)' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_urls: imageUrls.slice(0, 1), duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
    },
  },
  'happyhorse-1-1/reference-to-video': {
    name: 'HappyHorse 1.1 R2V',
    description: 'HappyHorse 1.1 R2V — up to 9 reference images with [Image N] prompt addressing, native audio. The headline new capability of 1.1.',
    capabilities: ['cinematic', 'animation', 'character', 'multi-reference', 'audio', 'lip-sync', 'latest', 'new', 'alibaba'],
    research: { verdict: 'The headline new capability of 1.1: up to 9 reference images anchoring characters, environments, style palettes, or products — well beyond most competitors\' 1-2 image limits — combined with native multilingual audio in one pipeline. Reference each image as "[Image 1]".."[Image 9]" in the prompt, in upload order. Caveats: many references can create conflicting guidance, subjects can still drift in complex multi-character scenes, and no third-party benchmark isolates R2V quality yet.', bestFor: ['character-consistent series with multiple reference angles', 'e-commerce/product videos needing consistent products across shots', 'apparel and product placement with style + composition refs', 'branded content with per-language lip-synced dialogue reusing the same refs'], weaknesses: ['image references only — no video or audio refs (Seedance 2.0 has both)', 'many refs can introduce conflicting instructions — 3-5 is the practical sweet spot', 'subjects still drift in complex multi-character scenes', 'refs must be ≥400px shortest side, ≤20MB; blurry/compressed refs degrade output'], promptTechniques: ['address refs explicitly: "the woman in a red qipao in [Image 1]" — order must match the media array', 'specify the object in each referenced image, not just the index', 'keep refs at consistent lighting/style', 'describe relationships between references explicitly'], communityInsights: ['9-ref + native multilingual audio combination is the most-cited differentiator vs Seedance 2.0 and Kling', 'no third-party benchmark isolates R2V quality yet — too new'], costEfficiency: 'Same published rates as T2V: 22.5 cr/s at 720p, 29 cr/s at 1080p. Cheaper than Seedance 2.0 (25 cr/s at 720p) for image-only multi-ref work at 720p.', comparedTo: { 'happyhorse/reference-to-video': '1.0 R2V is the same shape without audio at a lower estimated rate; 1.1 adds lip-sync and [Image N] prompt addressing.', 'seedance-2/text-to-video': 'Seedance accepts 9 images + 3 videos + 3 audio refs; HappyHorse 1.1 R2V is images-only but adds native multilingual lip-sync.', 'gemini-omni/video': 'Gemini Omni takes 7 images + 3 audio + 1 video + character IDs up to 4K; HappyHorse 1.1 is cheaper and takes more images.' }, lastResearched: '2026-07-02', sources: ['https://www.cometapi.com/what-is-happyhorse-1-1-benchmarks-use-cases-limits-advise/', 'https://www.explainx.ai/blog/happyhorse-1-1-alibaba-video-generation-model-2026', 'https://kie.ai/happyhorse-1-1'] },
    type: 'market',
    apiModel: 'happyhorse-1-1/reference-to-video',
    maxPromptChars: 5000,
    requiresImage: true,
    aspectRatios: ['16:9', '9:16', '3:4', '4:3', '4:5', '5:4', '1:1', '9:21', '21:9'],
    options: {
      duration: { type: 'number', min: 3, max: 15, default: 5, description: 'Duration in seconds (3-15)' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, reference_image: imageUrls.slice(0, 9), aspect_ratio: aspectRatio || '16:9', duration: opts.duration || 5, resolution: opts.resolution || '1080p' };
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
