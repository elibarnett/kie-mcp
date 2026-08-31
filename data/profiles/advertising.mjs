// Vertical profile: Advertising & Marketing (issue #91).
// Expert-reviewed 2026-08-27 (senior CD + web research): AI-disclosure intake
// (Meta/TikTok/EU AI Act), IAB extreme ratios, segment-chain constraint fixed,
// NB2 as volume default, Andromeda variant-similarity rule, numeric safe zones.
export default {
  id: 'advertising',
  name: 'Advertising & Marketing',
  media: ['image', 'video'],
  summary: 'Social posts, display ads, product heroes, campaign key visuals, and A/B variant sets — brand-safe, platform-sized, text-accurate, disclosure-aware.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What piece? (social post / story-reel cover / display banner set / product hero / campaign key visual / OOH-poster mock)', why: 'Sets the size matrix, text-rendering needs, and whether product reference photos are involved.' },
    { key: 'placement_disclosure', ask: 'Paid placement or organic? EU audience? Photoreal people in frame?', why: 'Meta auto-detects and labels AI in ads (and rejects undisclosed ones); TikTok requires AIGC labeling; EU AI Act Art. 50 (in force Aug 2026) requires machine-readable marking of synthetic content. This decides the disclosure plan before anything is generated.' },
    { key: 'platforms', ask: 'Which platforms and sizes? (IG 1:1 + 4:5, story 9:16, X 16:9, display IAB sizes — leaderboards/skyscrapers are extreme ratios)', why: 'Each ratio is its own generation, not a crop. IAB 8:1-class shapes only exist on nano-banana-2-lite.' },
    { key: 'brand', ask: 'Brand colors (hex + description), fonts vibe, logo handling (composited in post — never generated), and tone (premium-minimal, playful-loud, corporate, UGC-authentic)?', why: 'Models approximate hex unless also described; generated logos are always wrong and legally risky; tone drives styling vocabulary.' },
    { key: 'copy_langs', ask: 'Exact in-image text word for word — and which markets/languages? (non-Latin scripts are unreliable in EVERY model: localized copy gets overlaid in post, always)', why: 'In-image text routes to the text tier and is verified letter-by-letter; multi-language campaigns need the text-free-master + overlay pipeline from the start.' },
    { key: 'product', ask: 'Real product shots available? (upload_file → composition keeps the actual product; generating "a product like ours" is off-brand)', why: 'The product must be THE product.' },
    { key: 'variants_purpose', ask: 'How many variants, and are they for A/B TESTING or market LOCALIZATION?', why: 'Different economics AND different construction: Meta\'s ranking collapses creatives >60% similar into one — tests need different hooks/focal subjects; localization suits cheap region-swaps.' },
    { key: 'approval_claims', ask: 'Who signs off, how many rounds, what deadline? Any legal/claims constraints (regulated category, mandatory disclaimers)?', why: 'Approval loops decide when to spend on hero tiers; regulated verticals constrain imagery and need reserved disclaimer space.' },
  ],

  routing: [
    { deliverable: 'social post', tiers: {
        volume: { model: 'nano-banana-2', note: 'production default — 4 cr, 4K, 14 refs for brand-kit conditioning; Lite only when latency/volume dominates' },
        with_text: { model: 'gpt-image/2-text-to-image', note: 'headline baked in — best text rendering (~95%+ accuracy)' },
        alt_text: { model: 'ideogram/v3-text-to-image', note: 'stylized display lettering / poster hierarchy' },
    }},
    { deliverable: 'display banner set', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'standard ratios; keep CTA text short (<5 words)' },
        extreme_ratios: { model: 'nano-banana-2-lite', note: 'the ONLY model with 8:1/4:1/1:4/1:8 for IAB leaderboards/skyscrapers — generate text-free, overlay copy in post' },
        variants: { tool: 'grok_image_edit', note: 'region-swap variants require the master to be GENERATED on grok-imagine-image-2-0 (segment map is grok-task-only). Foreign masters: whole-image edits.' },
    }},
    { deliverable: 'product hero', tiers: {
        from_photos: { model: 'nano-banana-pro', note: 'multi-image composition: recraft/remove-background the packshot first, then compose. Verify output (degradation windows).' },
        premium_compose: { model: 'gpt-image/2-image-to-image', note: '16-ref reasoning compositing — product + brand kit + scene refs' },
        edit_scene: { tool: 'grok_image_edit', note: 'whole-image mode on an uploaded packshot: new backdrop, keep product' },
        surgical: { model: 'flux-kontext-pro', note: 'small fixes on real photography' },
    }},
    { deliverable: 'campaign key visual', tiers: {
        iterable: { model: 'grok-imagine-image-2-0/text-to-image', note: 'generate the master HERE (4 cr) when regional adaptation is planned — unlocks the free segment → 4 cr region-edit chain' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose → KV layers. NOTE: bills per output layer (7 cr each — a 5-layer KV ≈ 35 cr)' },
        final: { model: 'nano-banana-pro', note: 'hero concept quality; verify (degradation windows)' },
    }},
    { deliverable: 'story-reel cover', tiers: {
        default: { model: 'nano-banana-2', note: '9:16, bold single-subject' },
        with_text: { model: 'ideogram/v3-text-to-image', note: '' },
    }},
    { deliverable: 'OOH-poster mock', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'poster-native typography' },
        final: { model: 'gpt-image/2-text-to-image', note: 'then topaz/image-upscale for large-format' },
    }},
    { deliverable: 'video ad', tiers: {
        default: { model: 'pixverse-v6/image-to-video', note: 'animate the APPROVED key visual — the KV carries the brand QA (hex, logo, copy), the video adds motion' },
        budget_variants: { model: 'grok-imagine-video-1-5-preview', note: '1.6-3 cr/s with audio — hook/variant testing before committing' },
        multi_scene: { model: 'kling-3-omni/text-to-video', note: '6-15s bumpers with per-shot scripting via multi_prompt' },
        hero: { model: 'veo-3/text-to-video', note: '50 cr/s cinematic finals with native audio; ad disclosure rules from the placement intake apply doubly to video' },
    }},
  ],

  promptFormulas: {
    'social post': {
      structure: '[platform + aspect] + [single focal subject] + [brand palette as hex + description] + [tone styling] + [copy in quotes if in-image] + [negative space for overlay if not]',
      example: 'Instagram post, 1:1. A single ceramic coffee cup on warm oak, steam catching morning light. Brand palette: deep cobalt #1D4ED8 accents, cream background. Premium-minimal, soft shadows, generous negative space upper third for overlaid copy.',
      perModel: {
        'gpt-image/2-text-to-image': 'Exact copy in double quotes; font vibe not font name. Known warm-color bias — specify "neutral white balance" on cool palettes.',
        'nano-banana-2': 'Attach the brand kit (approved ads, palette swatch, packshots) as reference images on every call — reference conditioning is the 2026 consistency standard.',
      },
      pitfalls: [
        'Never let the model draw the logo — reserve clear space, composite in post.',
        'In-image text: verbatim quotes, ≤8 words per line, verified character-by-character.',
        'Hex AND description; hex alone drifts.',
        'One generation per aspect ratio — recomposing beats cropping. ideogram/v3-reframe (5 cr outpaint) extends an approved master to new ratios; keep product/copy inside the original region (extensions can drift).',
        'Story/Reels numeric safe zones: keep critical content out of the top ~14% (250px), bottom 20-35% (Reels ~400px incl. right rail), and 6% side margins.',
      ],
    },
    'product hero': {
      structure: '[the actual product via reference images, background removed] + [scene/backdrop concept] + [lighting spec] + [surface + reflections] + [prop restraint] + [angle]',
      pitfalls: [
        'i2i with real packshots or nothing — lookalike products misrepresent the SKU.',
        '"Label facing camera, fully legible" or it rotates away.',
        '"No other objects" — models set-dress enthusiastically.',
      ],
    },
    'campaign key visual': {
      structure: '[big idea in one sentence] + [focal talent/product] + [world/setting] + [brand palette + light] + [reserved zones: logo, headline, disclaimer] + [campaign mood refs]',
      pitfalls: [
        'Reserve EVERY post-production zone (logo, headline, legal line) as explicit negative space.',
        'A/B testing variants must differ in hook/focal subject — region-swapped backgrounds are >60% similar and platforms collapse them into one creative. Region swaps are the LOCALIZATION tool.',
        'Plan refresh cadence: creative fatigue in 2-3 weeks; the 4 cr grok edit loop makes monthly refresh batches cheap.',
      ],
    },
  },

  workflows: [
    { name: 'Brand-consistency kit (standing setup)', steps: [
      'upload_file the kit once per campaign: approved packshots, palette swatch card, 2-3 approved past ads',
      'Pass the kit as reference images on every nano-banana-2 / nano-banana-pro / gpt-image/2 job',
      'Reference conditioning holds brand look better than any prompt prefix',
    ]},
    { name: 'Localization program (cheapest path)', steps: [
      'Generate the master on grok-imagine-image-2-0 (4 cr) — REQUIRED for the region-swap chain',
      'grok_segment_map (free) → named regions',
      'grok_image_edit per market: swap background/props region, product and layout untouched (4 cr each)',
      'Localized copy ALWAYS overlaid in post (never bake non-Latin text)',
    ]},
    { name: 'A/B testing program (distinct from localization)', steps: [
      'Brief 3-5 genuinely different hooks (subject, angle, benefit)',
      'Generate each on nano-banana-2 with the brand kit attached',
      'Ship 20+ fresh creatives/month; expect 2-3 week fatigue windows',
    ]},
    { name: 'Platform fan-out', steps: [
      'Master at the campaign hero ratio',
      'ideogram/v3-reframe to adjacent ratios (product/copy in the original region), or re-generate per ratio with adjusted composition',
      'Extreme IAB shapes: nano-banana-2-lite text-free + overlay',
    ]},
    { name: 'Product hero from packshots', steps: [
      'upload_file the packshot(s) — file_path mode',
      'recraft/remove-background for a clean cutout',
      'Compose via gpt-image/2-image-to-image or nano-banana-pro into the scene concept',
      'flux-kontext-pro for surgical cleanup; topaz/image-upscale for print/OOH',
    ]},
  ],

  qualityChecklist: [
    'In-image text verified character-by-character (the #1 shipped error)',
    'AI-disclosure determination recorded per platform/region (Meta, TikTok, EU AI Act); C2PA/SynthID credentials NOT stripped',
    'Brand colors within tolerance of hex after any post-correction',
    'Logo space clean and empty — logo composited, never generated',
    'The product is THE product (label, proportions, cap color)',
    'Imagery-as-claim check: depicted results/outcomes must be substantiable (FTC)',
    'Photoreal faces resemble no real person/talent without a release',
    'Numeric safe zones respected per platform; overlay text meets WCAG contrast at feed size',
    'Claims/disclaimer space reserved where required',
    'Test variants genuinely distinct (not >60% similar); localization variants product-identical',
  ],
}
