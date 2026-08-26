// Vertical profile: Brand & Graphic Design (issue #91).
// Expert-reviewed 2026-08-27 (senior identity designer + web research):
// gpt-image-2 as the text-accuracy default, competitive/positioning intake,
// AI-disclosure & trademark screens, moodboard-first workflow, print pipeline.
export default {
  id: 'brand-design',
  name: 'Brand & Graphic Design',
  media: ['image'],
  summary: 'Logo concepts, posters, typography-led pieces, patterns, and brand exploration — text-accuracy-first, print-aware, trademark-conscious.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What piece? (logo concepts / poster / typographic composition / brand pattern / business-card or stationery mock / album-book cover / moodboard-stylescape)', why: 'Logo exploration and a finished poster are different rigor levels; patterns have tiling constraints; moodboards are the highest-value AI phase.' },
    { key: 'brand_attributes', ask: '3-5 brand personality words (e.g. "clinical, warm, established") — and the positioning in one sentence?', why: 'Positioning separates identity work from decoration; it is the strongest steering input for greenfield exploration.' },
    { key: 'competitive_context', ask: 'Top 3 competitors and what their marks look like?', why: 'Differentiation is the entire job — and this is the cheap first trademark-collision screen. No identity designer starts without the category audit.' },
    { key: 'text', ask: 'EXACT text, word for word, including capitalization? (brand name, tagline, dates)', why: 'Every character will be scrutinized; verbatim quoting routes to the text tier and enables letter-by-letter verification.' },
    { key: 'identity', ask: 'Existing identity to respect (hex colors, typeface vibe, motifs) — or greenfield exploration?', why: 'Inside an identity = constraint satisfaction; greenfield = deliberate variety (propose directions, never one answer).' },
    { key: 'medium_process', ask: 'Screen or print? Size? Print: CMYK or spot color, bleed spec from the printer?', why: 'AI outputs RGB — neons, deep blacks, and rich greens drift worst in CMYK conversion. A brief-time question, not a proof-time surprise. A2@300dpi ≈ 7000px → topaz upscale territory.' },
    { key: 'logo_usage', ask: 'For logo concepts: where will it live? (app icon 48px, signage, embroidery, single-color print?)', why: 'Smallest-size legibility and one-color reproduction are the real logo tests.' },
    { key: 'disclosure_rights', ask: 'Does the client know AI is used for exploration, and will they register the mark?', why: 'Professional norms expect an explicit AI statement; AI raster output is not itself protectable — the human vector redraw is the ownable asset. One sentence now prevents a contractual mess.' },
  ],

  routing: [
    { deliverable: 'logo concepts', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'exploration engine: DESIGN style, seeds, negative_prompt ("gradient, 3D, bevel, drop shadow, mockup")' },
        volume: { model: 'grok-imagine-image-2-0/text-to-image', note: '4 cr typography-trained exploration — an 8-direction sprint for 32 cr, plus the free segment→edit chain on its own output' },
        shortlist_check: { model: 'gpt-image/2-text-to-image', note: 'second opinion on shortlisted directions — highest character accuracy' },
    }},
    { deliverable: 'poster', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'the default whenever copy exceeds a headline (~95%+ char accuracy); dense copy still belongs in post' },
        display_type: { model: 'ideogram/v3-text-to-image', note: 'stylized display lettering / poster hierarchy — its remaining edge' },
        art_led: { model: 'nano-banana-pro', note: 'image dominates, text is one line; verify output (degradation windows)' },
    }},
    { deliverable: 'typographic composition', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'type-as-image experiments' },
        accuracy: { model: 'gpt-image/2-text-to-image', note: 'when every glyph must be right' },
    }},
    { deliverable: 'brand pattern', tiers: {
        default: { model: 'nano-banana-2', note: 'production-proven, 4 cr; "seamless tileable pattern" + 50% offset check' },
        alt: { model: 'seedream/4.5-text-to-image', note: 'proven alternative' },
        experimental: { model: 'seedream/5-pro-text-to-image', note: 'unbenchmarked (days old); layered deliverables via layer-decompose' },
    }},
    { deliverable: 'business-card or stationery mock', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'small legible type is the whole job' },
        with_real_logo: { model: 'gpt-image/2-image-to-image', note: 'compose the client\'s ACTUAL logo file (uploaded) into mocks; logo reproduction is flaky — flux-kontext-pro for preservation-critical placements' },
    }},
    { deliverable: 'album-book cover', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'title + artist lockups' },
        art_led: { model: 'seedream/5-pro-text-to-image', note: 'imagery first; layer-decompose lifts art from type for print separation' },
    }},
    { deliverable: 'moodboard-stylescape', tiers: {
        default: { model: 'nano-banana-2-lite', note: 'grid of visual territories, cheap and fast — direction-setting is AI\'s highest-value identity phase' },
        iterable: { model: 'grok-imagine-image-2-0/text-to-image', note: 'region-editable boards via the free segment chain' },
    }},
  ],

  promptFormulas: {
    'logo concepts': {
      structure: '"logo design" + [mark type: wordmark/lettermark/pictorial/abstract] + "the text: "[EXACT NAME]"" + [brand attributes] + [style movement] + [1-2 colors max, hex] + "flat vector style, white background, centered, no mockup"',
      example: 'Logo design, combination mark. The text: "NORTHFORGE" in a geometric sans, with an abstract anvil-arrow mark above. Attributes: rugged, precise, established. Swiss modernist style. Two colors: charcoal #1F2937 and ember orange #EA580C. Flat vector style, white background, centered, no mockup scene.',
      perModel: {
        'ideogram/v3-text-to-image': 'State the mark type explicitly; use negative_prompt for the anti-effects list instead of prose.',
        'gpt-image/2-text-to-image': 'Best glyph accuracy on the shortlist re-render.',
      },
      pitfalls: [
        'Generated logos are EXPLORATION — the chosen direction gets redrawn as a real vector; the redraw is also the protectable asset.',
        'AI letterspacing/kerning is always off — wordmarks are directional, never trace them.',
        '"No mockup" or you get the logo on a coffee cup; 2 colors max or you get rainbows.',
        'Check EVERY letter — logo text errors are the most expensive typos in design.',
      ],
    },
    'poster': {
      structure: '[movement/style] + [hierarchy: headline in quotes, supporting lines in quotes, smallest last] + [image/motif role] + [palette hex, press-safe when printing] + [aspect + generous margins]',
      pitfalls: [
        'List text in hierarchy order — models size accordingly.',
        'Dense body copy goes in post even on gpt-image-2.',
        '"Generous margins" — models fill edge-to-edge and printers crop.',
        'Print: RGB→CMYK drift hits neons/deep blacks/rich greens hardest — specify press-safe brand colors up front.',
      ],
    },
    'brand pattern': {
      structure: '"seamless tileable pattern" + [motifs from the identity] + [density: sparse/medium] + [palette hex, background hex] + "flat, no gradients, no focal point, even distribution"',
      pitfalls: ['A focal point breaks the repeat; forbid it explicitly.', '50% offset tile test before shipping.'],
    },
    'business-card or stationery mock': {
      structure: '[card size + bleed + safe area] + [exact type block in quotes: name / title / contacts] + [logo placement zone] + [paper/finish suggestion]',
      pitfalls: ['Type block verified line-by-line.', 'Keep critical content inside the safe area; state the bleed.'],
    },
  },

  workflows: [
    { name: 'Moodboard-first direction sprint', steps: [
      'nano-banana-2-lite: 4-6 visual-territory boards from the brand attributes (typography feel, palette, imagery world per territory)',
      'Client picks a territory BEFORE any logo prompt — direction-setting is where AI earns its keep',
      'Carry the chosen board as a reference image into all subsequent work',
    ]},
    { name: 'Logo exploration sprint', steps: [
      'Category audit from competitive_context — note shapes/colors to avoid',
      '8 directions across mark types on ideogram or grok (2 wordmarks, 2 lettermarks, 2 pictorial, 2 abstract)',
      'Reverse-image/similarity screen on the shortlist BEFORE client presentation (trademark hygiene)',
      'Shortlist re-render on gpt-image/2 for glyph accuracy; winning direction → human vector redraw',
      'Deck labels concepts as AI-assisted exploration',
    ]},
    { name: 'Poster to print', steps: [
      'gpt-image/2-text-to-image at the target aspect (grok-2.0 base instead if regional fix rounds are expected — segment chain is grok-only)',
      'Letter-by-letter proof of ALL text',
      'topaz/image-upscale to print resolution (A2@300dpi ≈ 7000px); CMYK soft-proof before the printer does it for you',
      'Regional fixes: grok chain on grok-generated posters, ideogram/v3-edit mask inpaint otherwise',
    ]},
    { name: 'Applying the client\'s real logo', steps: [
      'upload_file the actual logo file (never regenerate it)',
      'gpt-image/2-image-to-image composes it into stationery/signage mocks',
      'flux-kontext-pro for preservation-critical placements',
    ]},
  ],

  qualityChecklist: [
    'Every character of every word correct — letter by letter, twice',
    'Trademark screen done on shortlisted marks before presentation',
    'Colors on brand hex; press-safe CMYK soft-proof for print; effective ≥300dpi at final size after upscale',
    'Logo concepts legible at 48px and survive single-color reduction',
    '100%-zoom artifact pass: over-sharpening, mushy letterform counters',
    'Margins printable; nothing critical in the outer 5% or beyond the safe area',
    'Patterns tile seamlessly at 50% offset',
    'Deck/deliverables carry the AI-assisted-exploration statement',
  ],
}
