// Extracted from server.mjs for reviewability (issue #46). Pure data — no
// server-scope references. Imported (and re-exported) by server.mjs.


export const MODEL_REGISTRY = {
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
  'nano-banana-2-lite': {
    name: 'Nano Banana 2 Lite',
    description: 'NEW (June 30, 2026) — Gemini 3.1 Flash-Lite Image. ~4s generation, 1K-only, 4 cr (empirical — kie advertises 3). The drafting/high-volume tier of the NB2 family; replaces the original Nano Banana.',
    capabilities: ['photorealistic', 'illustration', 'text-rendering', 'product-photography', 'latest', 'new', 'budget'],
    research: { verdict: 'Google\'s speed/cost tier of the Nano Banana 2 family — officially Gemini 3.1 Flash-Lite Image, released June 30, 2026. Generates 1K-only images in ~4 seconds (roughly 2.7x faster than NB2) and surprisingly posts a higher reported T2I Arena Elo (1251) than Nano Banana Pro (1245) — though blind-preference Elo does not capture NB2\'s advantage on complex multi-object prompts, fine text, and high-res deliverables. Keeps the family\'s core strengths (prompt adherence, character consistency, in-image text, editing and multi-image composition in one call, SynthID watermark) but drops Search grounding, 2K/4K output, and async batch access. The 48-hours-post-launch verdict: an excellent drafting/high-volume tier and the official replacement for the original Nano Banana, but not a replacement for NB2 as the production default. Lite-specific data is still thin.', bestFor: ['high-volume, latency-sensitive pipelines: ad variants, e-commerce product images, social graphics at scale', 'fast visual drafting (4s round-trip) before finalizing on nano-banana-2 or Pro', 'real-time / interactive apps where 20s NB2 latency is too slow', 'prompt-based editing and multi-image composition on a budget', 'generating reference frames for image-to-video pipelines'], weaknesses: ['hard 1K resolution cap — no 2K/4K; unsuitable for print or large-format', 'weaker small-text rendering and infographic accuracy than NB2', 'no Google Search grounding', 'character-consistency wobbles across scene changes', 'complex edits (masked editing, major relighting) can produce artifacts', 'Lite-specific independent benchmarks scarce 2 days post-launch'], promptTechniques: ['family prompt style carries over: narrative paragraphs (Style + Subject + Setting + Action + Composition), not keyword lists', 'wrap desired in-image text in quotes and keep it LARGE — small text is the known failure mode', 'use as a draft loop: iterate cheaply, then re-run the winning prompt on nano-banana-2 at 2K/4K', 'keep compositions simple (1-2 subjects); route multi-character scenes to NB2/Pro', 'prefer simple global edits; avoid masked edits and dramatic relighting'], communityInsights: ['launch-day reception mixed: praised for speed/cost, questioned on quality-per-dollar (anecdotal, ~2 days old)', 'reported Arena Elo 1251 beats Nano Banana Pro (1245) in blind preference — provisional single-snapshot figure', 'Google positions it as the official successor to the original Nano Banana (gemini-2.5-flash-image): better, faster, cheaper', 'unverified single source: 88.2% usable-generation rate'], costEfficiency: 'Empirically 4 cr ($0.02) per 1K image (measured 2026-07-02 via balance delta — kie\'s site advertises 3 cr but the charge is 4). That is the SAME price as nano-banana-2, so on kie the economics are purely speed (~4s vs 3-20s), not cost. Still ~59% of Google\'s official $0.034.', comparedTo: { 'nano-banana-2': 'Same family, one tier down: ~4s vs 3-20s, 1K-only vs 4K, no Search grounding, weaker small text. NB2 stays the production default; Lite wins when latency or volume dominates.', 'nano-banana-pro': 'Pro (24 cr) wins every complex-composition and fine-detail test despite Lite\'s provisional Elo edge; opposite ends of the family.', 'z-image': 'z-image (3 cr) is the same price with no editing pedigree or text strength; Lite should beat it on prompt adherence and in-image text.', 'qwen/text-to-image': 'Qwen (3 cr) beats Lite on native 2K and CJK typography; Lite wins on speed, character consistency, and composition.' }, lastResearched: '2026-07-02', sources: ['https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/', 'https://deepmind.google/models/gemini-image/flash-lite/', 'https://techcrunch.com/2026/06/30/google-introduces-a-faster-cheaper-image-generator-with-nano-banana-2-lite/', 'https://kie.ai/nano-banana-2-lite', 'https://www.buildfastwithai.com/blogs/nano-banana-2-lite-review-fastest-ai-image-generator-2026'] },
    type: 'market',
    maxPromptChars: 20000,
    aspectRatios: ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9', 'auto'],
    options: {},
    buildInput(prompt, aspectRatio, imageUrls) {
      const input = { prompt, aspect_ratio: aspectRatio || 'auto' };
      if (imageUrls?.length) input.image_urls = imageUrls.slice(0, 10);
      return input;
    },
  },
  'omnihuman-1-5/subject-detection': {
    name: 'OmniHuman 1.5 Subject Detection',
    description: 'FREE utility (creditsConsumed=0, verified live 2026-07-02) — detects up to 5 subjects in an image and returns mask images. Feed the masks to omnihuman-1-5 (mask_url) to control which subject speaks in multi-person scenes.',
    capabilities: ['utility', 'mask', 'avatar-prep'],
    research: { verdict: 'Companion utility for the OmniHuman 1.5 pipeline, mirroring BytePlus\'s official Subject Detection pre-step: pass a portrait image, get back mask images for each detected subject (up to 5). Functionally required for multi-person OmniHuman work — you pass the chosen mask(s) as mask_url in the omnihuman-1-5 call so the correct subject speaks. For single-person, front-facing portraits you can skip it entirely. kie also exposes omnihuman-1-5/human-identification (validates that an image contains a usable animatable subject before spending generation credits); we deliberately did not add a tool for it — OmniHuman itself fails fast with a clear error on unusable images, so the pre-check adds a roundtrip without saving meaningful cost.', bestFor: ['multi-person OmniHuman scenes: isolate each character, generate per-character clips with their audio', 'building conversation videos where different subjects speak in turn'], weaknesses: ['only useful as OmniHuman prep — not a general segmentation tool', 'image must be JPG/PNG ≤5MB, resolution under 4096x4096'], promptTechniques: ['no prompt needed — pass the portrait via image_urls', 'use a clear image where each subject is distinct'], communityInsights: ['mirrors the documented BytePlus Subject Recognition → Subject Detection → Video Generation workflow'], costEfficiency: 'FREE — a live run on 2026-07-02 reported creditsConsumed: 0. No reason not to use it before any multi-person OmniHuman generation.', comparedTo: { 'omnihuman-1-5': 'This is the prep step; omnihuman-1-5 consumes its mask output via mask_url.' }, lastResearched: '2026-07-02', sources: ['https://docs.kie.ai/market/omnihuman-1-5/subject-detection', 'https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman1_5overview'] },
    type: 'market',
    requiresImage: true,
    options: {},
    buildInput(_prompt, _ar, imageUrls) {
      return { image_url: imageUrls?.[0] };
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
