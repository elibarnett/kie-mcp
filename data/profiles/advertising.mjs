// Vertical profile: Advertising & Marketing (issue #91).
export default {
  id: 'advertising',
  name: 'Advertising & Marketing',
  media: ['image'],
  summary: 'Social posts, display ads, product heroes, campaign key visuals, and A/B variant sets — brand-safe, platform-sized, text-accurate.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What piece? (social post / story-reel cover / display banner set / product hero / campaign key visual / OOH-poster mock)', why: 'Sets the size matrix, text-rendering needs, and whether product reference photos are involved.' },
    { key: 'platforms', ask: 'Which platforms and sizes? (IG 1:1 + 4:5, story 9:16, X 16:9, display IAB sizes...)', why: 'Each ratio should be its own generation, not a crop — composition must be re-framed per format.' },
    { key: 'brand', ask: 'Brand colors (hex), fonts vibe, and logo handling? (logo is composited in post — never generated)', why: 'Models approximate brand colors unless named as hex AND described ("deep cobalt #1D4ED8"); generated logos are always wrong and legally risky.' },
    { key: 'copy', ask: 'Exact in-image text, word for word — or is the image text-free with copy overlaid later?', why: 'In-image text routes to the text-rendering tier (gpt-image-2 / ideogram) and must be quoted verbatim; text-free frees model choice entirely.' },
    { key: 'product', ask: 'Real product shots available? (upload_file → image-to-image keeps the actual product; generating "a product like ours" is off-brand)', why: 'The product must be THE product. i2i with references preserves it; pure generation invents SKUs.' },
    { key: 'audience_tone', ask: 'Audience and tone? (premium-minimal, playful-loud, trustworthy-corporate, UGC-authentic)', why: 'Drives styling vocabulary and how much art direction vs. candid realism.' },
    { key: 'variants', ask: 'How many variants / is this an A/B program?', why: 'Variant volume changes the routing: master-plus-regional-edits (segment→edit) is far cheaper than regenerating each variant.' },
    { key: 'claims', ask: 'Any legal/claims constraints? (regulated category, mandatory disclaimers, forbidden imagery)', why: 'Regulated verticals (alcohol, finance, health) constrain imagery; disclaimers need reserved space.' },
  ],

  routing: [
    { deliverable: 'social post', tiers: {
        volume: { model: 'nano-banana-2-lite', note: 'high-volume feeds; text-free, copy overlaid in your design tool' },
        with_text: { model: 'gpt-image/2-text-to-image', note: 'headline baked in — best text rendering' },
        alt_text: { model: 'ideogram/v3-text-to-image', note: 'typographic/poster styles' },
    }},
    { deliverable: 'display banner set', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'per-size generations; keep CTA text short (<5 words)' },
        variants: { tool: 'grok_image_edit', note: 'master banner → segment → swap background/product per market, layout preserved' },
    }},
    { deliverable: 'product hero', tiers: {
        from_photos: { model: 'nano-banana-pro', note: 'multi-image composition: product refs via image_urls into a styled scene' },
        edit_scene: { tool: 'grok_image_edit', note: 'whole-image mode on an uploaded packshot: new backdrop, keep product' },
        surgical: { model: 'flux-kontext-pro', note: 'small fixes on real photography (reflections, backdrop sweep)' },
    }},
    { deliverable: 'campaign key visual', tiers: {
        value: { model: 'seedream/5-pro-text-to-image', note: 'then seedream_layer_decompose → KV layers for adaptation' },
        final: { model: 'nano-banana-pro', note: 'hero concept quality' },
        adapt: { tool: 'grok_segment_map', note: 'free segmentation of the master → per-region edits for market/format adaptations' },
    }},
    { deliverable: 'story-reel cover', tiers: {
        default: { model: 'nano-banana-2-lite', note: '9:16, bold single-subject compositions' },
        with_text: { model: 'ideogram/v3-text-to-image', note: '' },
    }},
    { deliverable: 'OOH-poster mock', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'poster-native typography' },
        final: { model: 'gpt-image/2-text-to-image', note: 'then recraft/crisp-upscale for large-format' },
    }},
  ],

  promptFormulas: {
    'social post': {
      structure: '[platform + aspect] + [single focal subject] + [brand palette as hex + description] + [tone styling] + [copy in quotes if in-image] + [negative space for overlay if not]',
      example: 'Instagram post, 1:1. A single ceramic coffee cup on warm oak, steam catching morning light. Brand palette: deep cobalt #1D4ED8 accents, cream background. Premium-minimal, soft shadows, generous negative space upper third for overlaid copy.',
      perModel: {
        'gpt-image/2-text-to-image': 'Put exact copy in double quotes; specify font vibe not font name ("clean geometric sans").',
        'nano-banana-2-lite': 'Keep it to subject + palette + tone; complexity wastes the cheap tier.',
      },
      pitfalls: [
        'Never let the model draw the logo — reserve clear space and composite in post.',
        'In-image text: quote it verbatim, ≤8 words per line, and VERIFY character-by-character before shipping.',
        'Name hex AND describe the color; hex alone drifts.',
        'One generation per aspect ratio — recomposing beats cropping.',
      ],
    },
    'product hero': {
      structure: '[the actual product via reference images] + [scene/backdrop concept] + [lighting spec: softbox/golden/hard] + [surface + reflections] + [prop restraint] + [angle]',
      pitfalls: [
        'i2i with real packshots or nothing — generated lookalike products misrepresent the SKU.',
        'State label legibility ("label facing camera, fully legible") or it rotates away.',
        'Restrain props explicitly ("no other objects") — models set-dress enthusiastically.',
      ],
    },
    'campaign key visual': {
      structure: '[big idea in one sentence] + [focal talent/product] + [world/setting] + [brand palette + light] + [reserved zones: logo, headline, disclaimer] + [campaign mood refs]',
      pitfalls: ['Reserve EVERY zone that post-production needs (logo, headline, legal line) as explicit negative space.', 'Faces sell but drift — for talent-consistent campaigns use ideogram/character with an approved face.'],
    },
  },

  workflows: [
    { name: 'A/B variant program (cheapest path)', steps: [
      'Generate the master visual at value or final tier',
      'grok_segment_map the master (free) → named regions',
      'grok_image_edit per variant: swap background/prop/color region, layout and product untouched',
      'Each variant ~4 cr vs full regeneration',
    ]},
    { name: 'Platform fan-out', steps: [
      'Master at the campaign hero ratio',
      'Re-generate (not crop) per platform ratio with the same prompt + adjusted composition line',
      'Batch through nano-banana-2-lite for feed sizes; keep the hero tier for story/cover formats',
    ]},
    { name: 'Product hero from packshots', steps: [
      'upload_file the packshot(s) — file_path mode',
      'nano-banana-pro multi-image composition into the scene concept',
      'flux-kontext-pro for surgical cleanup (reflections, edge artifacts)',
      'recraft/crisp-upscale for print/OOH sizes',
    ]},
  ],

  qualityChecklist: [
    'In-image text verified character-by-character (the #1 shipped-error in AI ad work)',
    'Brand colors within tolerance of the hex spec',
    'Logo space clean and empty — logo composited, never generated',
    'The product is THE product (label, proportions, cap color)',
    'Per-platform safe zones respected (story UI chrome, feed crop preview)',
    'Claims/disclaimer space reserved where required',
    'No unintended brands, faces, or trade dress in backgrounds',
  ],
}
