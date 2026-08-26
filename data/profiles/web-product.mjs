// Vertical profile: Web & Software Product Imagery (issue #91).
// Expert-reviewed 2026-08-27 (design-systems lead + web research): SVG-handoff
// question first, reference-anchored families, i2i dark-mode pairs (no seeds on
// seedream/flux-2!), grok revision loop, concrete og safe zones.
export default {
  id: 'web-product',
  name: 'Web & Software Product Imagery',
  media: ['image'],
  summary: 'In-product imagery for apps and sites: empty states, feature illustrations, icon sets, onboarding art, hero/og images, 404s — design-system-consistent.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'format_handoff', ask: 'Raster PNG acceptable, or does your pipeline require SVG? (kie outputs raster only — SVG means a vectorization handoff, see workflow)', why: 'THE first question. Production icon/illustration systems are usually SVG (currentColor theming, crispness, size); shipping PNGs into an SVG system means redone work.' },
    { key: 'deliverable', ask: 'What piece? (empty state / feature spot illustration / icon set / onboarding sequence / hero or og:image / error-404 art / abstract avatar placeholders / pattern-background)', why: 'Each slots into a different UI context. (Avatars stay ABSTRACT — AI faces as testimonial imagery reads as fabricated social proof.)' },
    { key: 'design_system', ask: 'Design-system anchors: primary + accent hex, corner-radius vibe, illustration style (flat/outline/3D-clay/gradient-mesh/hand-drawn), tone (playful, technical, enterprise-calm) — and upload an existing illustration/icon to match if one exists', why: 'In-product art must look native; a reference image via upload_file beats any description and feeds the reference-anchored routes.' },
    { key: 'mode', ask: 'Light mode, dark mode, or both?', why: 'Both = generate light, then i2i-recolor with locked composition (see workflow) — seedream/5 and flux-2 have NO seed param, so re-prompting cannot lock pairs.' },
    { key: 'context_size', ask: 'Where does it render and how big? (empty-state card ~400px, feature section ~800px, og:image 1200x630, favicon 32px)', why: 'Detail density must match render size — an og:image needs bold simple shapes; favicon-scale dies under detail.' },
    { key: 'subject', ask: 'What does the piece communicate? (e.g. "no invoices yet — create your first", "real-time collaboration")', why: 'Product illustration is functional: the metaphor matters more than the rendering.' },
    { key: 'set_scope', ask: 'One-off, or part of a family (icon set, onboarding sequence, all empty states)?', why: 'Families are anchored on approved pieces passed as references — prefixes alone drift.' },
  ],

  routing: [
    { deliverable: 'empty state', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'flat/minimal register, cheap iteration' },
        value: { model: 'flux-2/flex-text-to-image', note: 'clean vector-ish shapes (traces well for SVG handoff)' },
        final: { model: 'nano-banana-2', note: 'reasoning-capable at 4 cr — try before 24 cr NB-Pro; give it the UI state and let it invent the metaphor' },
        family_addition: { model: 'seedream/5-lite-image-to-image', note: 'anchor on 1-2 approved states as references' },
        iterate: { tool: 'grok_segment_map', note: 'cheapest revision loop — but only on grok-generated art; generate on grok-2.0 when region iteration is expected' },
    }},
    { deliverable: 'feature spot illustration', tiers: {
        default: { model: 'flux-2/pro-text-to-image', note: 'crisp product-adjacent illustration' },
        draft: { model: 'seedream/5-lite-text-to-image', note: '' },
        with_ui: { model: 'gpt-image/2-text-to-image', note: 'fake UI with readable labels' },
        family_addition: { model: 'gpt-image/2-image-to-image', note: 'reasons across up to 16 refs — strongest family-consistency engine' },
    }},
    { deliverable: 'icon set', tiers: {
        default: { model: 'flux-2/flex-text-to-image', note: 'one icon per call, locked prefix: "flat outline icon, 2px stroke, [hex], centered on white, no text" — flat/hard-edged for clean vectorization; recraft utilities as post steps' },
        family_addition: { model: 'nano-banana-2', note: 'pass 2-3 approved icons as references' },
    }},
    { deliverable: 'onboarding sequence', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: 'locked prefix + numbered scenes; layer-decompose for parallax layers' },
        consistency: { model: 'gpt-image/2-image-to-image', note: 'anchor each scene on the approved first scene' },
    }},
    { deliverable: 'hero or og:image', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'og:images almost always carry the product name — text tier' },
        text_free: { model: 'flux-2/pro-text-to-image', note: 'copy overlaid in code' },
        responsive_crops: { model: 'ideogram/v3-reframe', note: 'hero → mobile/tablet ratios via outpainting instead of regenerating' },
        refresh: { tool: 'grok_image_edit', note: 'seasonal refresh of an existing hero, whole-image mode' },
    }},
    { deliverable: 'error-404 art', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'more personality allowed than in-flow art' },
    }},
    { deliverable: 'pattern-background', tiers: {
        default: { model: 'nano-banana-2', note: '"seamless tileable pattern, flat, [hex], no focal point" — 50% offset check' },
    }},
  ],

  promptFormulas: {
    'empty state': {
      structure: '[illustration style + line/fill spec] + [the metaphor] + [palette hex + description] + [centered, breathing room] + [flat background matching UI surface] + [no text] + (flat fills, hard edges if SVG handoff)',
      example: 'Flat minimal illustration, soft rounded shapes, 2px outlines, flat fills. An open cardboard box with a single document floating above it. Palette: slate #64748B lines, indigo #6366F1 accent, background #F8FAFC. Centered, generous negative space. No text.',
      perModel: {
        'nano-banana-2': 'Explain the UI state and let it propose: "empty state for an invoicing app, first-run, encouraging".',
        'seedream/5-lite-text-to-image': 'Specify the metaphor yourself; keep the style spec tight.',
      },
      pitfalls: [
        '"No text" always — models write garbled UI copy; real copy lives in the DOM.',
        'Background must match the UI surface hex or card edges show.',
        'Models APPROXIMATE hex — plan a palette-snap in post for flat art rather than re-rolling.',
        'Gradients/glows vectorize badly — flat fills and hard edges when SVG is the target.',
      ],
    },
    'icon set': {
      structure: 'LOCKED PREFIX: "[style] icon, [stroke]px stroke, [hex], centered, white background, no text, no shadow, flat fills" + per-icon subject noun',
      pitfalls: [
        'Prefix VERBATIM per icon; family additions anchor on approved icons as references (stronger than the prefix).',
        'One icon per generation; grids come back inconsistent.',
        'Generate ~4x final size → vectorize or crisp-upscale → downscale in build; reject icons that muddy at 24px.',
      ],
    },
    'hero or og:image': {
      structure: '[1200x630 og] + [product name text in quotes if baked] + [one visual concept] + [brand hex palette] + [critical content inside the center ~1080x565 safe zone]',
      pitfalls: [
        'og crops at the edges on many surfaces — critical content inside center ~1080×565 of 1200×630.',
        'Export < 1MB (and < 300KB if WhatsApp preview matters).',
        'Verify baked product-name text character-by-character.',
      ],
    },
  },

  workflows: [
    { name: 'Raster → SVG handoff (when the system needs vectors)', steps: [
      'Generate flat, high-contrast, hard-edged art at 4x target size',
      'Vectorize OUTSIDE kie (Illustrator Image Trace or an AI vectorizer — kie has no vector output)',
      'Cleanup pass; deliver SVG using currentColor for themable strokes/fills',
      'Decision rule: SVG for in-product icons/flat art; raster is fine for og:images, heroes, marketing',
    ]},
    { name: 'Dark-mode pair (composition-locked)', steps: [
      'Generate the light version and get it approved',
      'i2i recolor with the light version as input: "dark surface #0F172A, identical composition, same shapes" via seedream/5-lite-image-to-image, flux-2/flex-image-to-image, or grok_image_edit whole-image',
      'NEVER re-prompt from scratch for the pair — seedream/5 and flux-2 have no seed to lock composition',
      'Ship as a real pair: app theme toggles are manual — media-query-only swaps break with in-app toggles',
    ]},
    { name: 'Empty-state family', steps: [
      'Style prefix from the design system; first state approved by the team',
      'Subsequent states anchored on the approved art as references (i2i), prefix as backup',
      'Dark pass per the pair workflow; recraft/remove-background if states float on varied surfaces',
      'Record model + prompt + references per shipped asset (design-ops provenance)',
    ]},
    { name: 'Landing page kit', steps: [
      'Hero: flux-2/pro-text-to-image text-free, or gpt-image/2 with the baked headline',
      'Feature spots: locked prefix + per-feature metaphors; family additions via gpt-image/2 refs',
      'og:image on gpt-image/2 with safe-zone margins; responsive crops via ideogram/v3-reframe',
      'Seasonal refresh later: grok_image_edit whole-image on the hero',
    ]},
  ],

  qualityChecklist: [
    'Style matches the surrounding UI (screenshot the art in situ)',
    'Palette on-hex AFTER post-correction; no rogue gradients',
    'No baked text except deliberate text-tier pieces — verified letter-by-letter; WCAG contrast for any baked text',
    'Reads at actual render size (100% zoom); icon family consistent in stroke, radius, optical size; survives 24px',
    'Dark variant genuinely dark-native and swaps under the app\'s MANUAL theme toggle, not just prefers-color-scheme',
    'og:image critical content inside the center safe zone; file weight under limits',
    'SVG deliverables: clean paths, currentColor, no embedded rasters',
    'Alt-text decision recorded per asset (decorative vs meaningful)',
    'Provenance logged: model + prompt + refs per shipped asset',
  ],
}
