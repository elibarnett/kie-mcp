// Vertical profile: Brand & Graphic Design (issue #91, Phase 2).
export default {
  id: 'brand-design',
  name: 'Brand & Graphic Design',
  media: ['image'],
  summary: 'Logo concepts, posters, typography-led pieces, patterns, and brand exploration — text-accuracy-first, print-aware.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What piece? (logo concepts / poster / typographic composition / brand pattern / business-card or stationery mock / album-book cover)', why: 'Logo exploration and a finished poster are different rigor levels; patterns have tiling constraints.' },
    { key: 'text', ask: 'EXACT text, word for word, including capitalization? (brand name, tagline, dates)', why: 'Every character will be scrutinized. Verbatim quoting routes to the text-rendering tier and enables letter-by-letter verification.' },
    { key: 'identity', ask: 'Existing identity to respect (colors as hex, typefaces vibe, established motifs) — or greenfield exploration?', why: 'Brand work inside an identity is constraint-satisfaction; greenfield wants deliberate variety (propose directions, not one answer).' },
    { key: 'medium', ask: 'Screen or print? Size? (A2 poster, square social, business card)', why: 'Print needs upscale headroom and restrained fine detail; a business card dies under poster-level complexity.' },
    { key: 'style_refs', ask: 'Style references or movements? (Swiss/international, brutalist web, Art Deco, hand-lettered, Y2K chrome)', why: 'Named movements are the strongest style levers in typography-led work.' },
    { key: 'logo_usage', ask: 'For logo concepts: where will it live? (app icon 48px, signage, embroidery)', why: 'Smallest-size legibility and single-color reproduction are the real logo tests, and they change what to explore.' },
  ],

  routing: [
    { deliverable: 'logo concepts', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'strongest lettering/mark integration; explore 6-10 directions cheaply' },
        alt: { model: 'gpt-image/2-text-to-image', note: 'second opinion on the shortlist' },
        note_tier: { model: 'recraft/crisp-upscale', note: 'concepts are CONCEPTS — final logos get redrawn as vectors by a designer; upscale only for presentation' },
    }},
    { deliverable: 'poster', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'poster-native typography' },
        final: { model: 'gpt-image/2-text-to-image', note: 'dense copy (dates, lineups, addresses)' },
        art_led: { model: 'nano-banana-pro', note: 'when the image dominates and text is one line' },
    }},
    { deliverable: 'typographic composition', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'type-as-image experiments' },
    }},
    { deliverable: 'brand pattern', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: '"seamless tileable pattern" from brand motifs + hex palette; verify tiling at 50% offset' },
    }},
    { deliverable: 'business-card or stationery mock', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'small legible type is the whole job' },
    }},
    { deliverable: 'album-book cover', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'title + artist lockups' },
        art_led: { model: 'seedream/5-pro-text-to-image', note: 'imagery first, layer-decompose to lift art from type for print separation' },
    }},
  ],

  promptFormulas: {
    'logo concepts': {
      structure: '"logo design" + [mark type: wordmark/lettermark/pictorial/abstract] + "the text: \x22[EXACT NAME]\x22" + [style movement] + [1-2 colors max, hex] + "flat vector style, white background, centered, no mockup"',
      example: 'Logo design, combination mark. The text: "NORTHFORGE" in a geometric sans, with an abstract anvil-arrow mark above. Swiss modernist style. Two colors: charcoal #1F2937 and ember orange #EA580C. Flat vector style, white background, centered, no mockup scene.',
      perModel: { 'ideogram/v3-text-to-image': 'State the mark type explicitly; it follows lettering instructions best of any model.' },
      pitfalls: [
        'Generated logos are exploration, not deliverables — the chosen direction gets redrawn as a real vector.',
        '"No mockup" or you get the logo on a coffee cup.',
        'Limit to 2 colors; models rainbow otherwise.',
        'Check EVERY letter — logo text errors are the most expensive typos in design.',
      ],
    },
    'poster': {
      structure: '[movement/style] + [hierarchy: headline in quotes, then supporting lines in quotes, smallest last] + [image/motif role] + [palette hex] + [aspect + margins]',
      pitfalls: [
        'List text in hierarchy order — models size accordingly.',
        'Over ~25 words of copy, accuracy collapses; put dense body text in post.',
        'Ask for "generous margins" — models fill edge-to-edge and printers crop.',
      ],
    },
    'brand pattern': {
      structure: '"seamless tileable pattern" + [motifs from the identity] + [density: sparse/medium] + [palette hex, background hex] + "flat, no gradients, no focal point, even distribution"',
      pitfalls: ['A focal point breaks the repeat; forbid it explicitly.', 'Verify with a 50% offset tile test before shipping.'],
    },
  },

  workflows: [
    { name: 'Logo exploration sprint', steps: [
      'ideogram/v3-text-to-image: 8 directions across mark types (2 wordmarks, 2 lettermarks, 2 pictorial, 2 abstract)',
      'Shortlist 2-3; regenerate each with small variations (weight, color, spacing)',
      'Present as concepts; winning direction goes to vector redraw outside the pipeline',
    ]},
    { name: 'Poster to print', steps: [
      'ideogram/v3-text-to-image at the target aspect',
      'Letter-by-letter proof of ALL text',
      'recraft/crisp-upscale to print resolution',
      'grok_segment_map + grok_image_edit for regional fixes instead of full regens (protects approved type)',
    ]},
  ],

  qualityChecklist: [
    'Every character of every word correct — proof it letter by letter, twice',
    'Colors on the brand hex; max palette respected',
    'Logo concepts legible at 48px and survive single-color reduction',
    'Poster margins printable; nothing critical in the outer 5%',
    'Patterns tile seamlessly at 50% offset',
    'Style consistent with the named movement, not generic-AI-poster',
  ],
}
