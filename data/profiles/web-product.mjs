// Vertical profile: Web & Software Product Imagery (issue #91).
// The in-product art a software team ships: empty states, feature spots,
// icon sets, onboarding art, hero/og images, error pages.
export default {
  id: 'web-product',
  name: 'Web & Software Product Imagery',
  media: ['image'],
  summary: 'In-product imagery for apps and sites: empty states, feature illustrations, icon sets, onboarding art, hero/og images, 404s — design-system-consistent.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What piece? (empty state / feature spot illustration / icon set / onboarding sequence / hero or og:image / error-404 page art / testimonial-avatar placeholders / pattern-background)', why: 'Each slots into a different UI context with different size, mood, and consistency rules.' },
    { key: 'design_system', ask: 'Design-system anchors: primary + accent colors (hex), corner radius vibe (sharp/soft), illustration style if one exists (flat/outline/3D-clay/gradient-mesh/hand-drawn)?', why: 'In-product art must look native to the UI around it; a style mismatch reads as clip-art. If a style exists, one reference screenshot via upload_file beats any description.' },
    { key: 'mode', ask: 'Light mode, dark mode, or both?', why: 'Both means generating pairs with locked composition — plan it up front, not as an afterthought.' },
    { key: 'context_size', ask: 'Where does it render and how big? (empty-state card ~400px, feature section ~800px, og:image 1200x630, favicon 32px...)', why: 'Detail density must match render size — og:images need bold simple shapes; a favicon-scale icon dies under detail.' },
    { key: 'subject', ask: 'What does the piece communicate? (e.g. "no invoices yet — create your first", "real-time collaboration feature", "sync across devices")', why: 'Product illustration is functional: it explains a state or feature. The metaphor matters more than the rendering.' },
    { key: 'tone', ask: 'Product tone: playful, technical-precise, enterprise-calm, developer-terminal?', why: 'A fintech empty state and an indie game landing page need opposite energy.' },
    { key: 'people', ask: 'People in illustrations: yes (diverse/abstract?) or object-metaphors only?', why: 'Human figures raise style-consistency difficulty sharply; many systems deliberately avoid them.' },
    { key: 'set_scope', ask: 'One-off, or part of a family that must stay consistent (icon set, onboarding sequence, all empty states)?', why: 'Families need a locked style prefix reused verbatim per piece, plus the same palette and line weight.' },
  ],

  routing: [
    { deliverable: 'empty state', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'flat/minimal illustration register, cheap iteration' },
        value: { model: 'flux-2/flex-text-to-image', note: 'clean vector-ish shapes' },
        final: { model: 'nano-banana-pro', note: 'when the metaphor is conceptually tricky — it reasons about the state being communicated' },
    }},
    { deliverable: 'feature spot illustration', tiers: {
        default: { model: 'flux-2/pro-text-to-image', note: 'crisp product-adjacent illustration, 1K/2K' },
        draft: { model: 'seedream/5-lite-text-to-image', note: '' },
        with_ui: { model: 'gpt-image/2-text-to-image', note: 'when the illustration contains fake UI with readable labels' },
    }},
    { deliverable: 'icon set', tiers: {
        default: { model: 'recraft/crisp-upscale', note: 'base icons via flux-2/flex with a locked style prefix, then crisp-upscale; remove-background for transparency' },
        base: { model: 'flux-2/flex-text-to-image', note: 'one icon per call, identical prefix: "flat outline icon, 2px stroke, [hex], centered on white, no text"' },
    }},
    { deliverable: 'onboarding sequence', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: 'series consistency via a locked prefix + numbered scene lines; layer-decompose if screens need parallax layers' },
    }},
    { deliverable: 'hero or og:image', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'og:images almost always carry the product name — text tier required' },
        text_free: { model: 'flux-2/pro-text-to-image', note: '16:9-ish hero art, copy overlaid in code' },
        iterate: { tool: 'grok_image_edit', note: 'seasonal/campaign refresh of an existing hero: whole-image mode keeps the layout' },
    }},
    { deliverable: 'error-404 page art', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'a touch more personality allowed than in-flow art' },
    }},
    { deliverable: 'pattern-background', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: '"seamless tileable pattern, flat, [hex palette], no focal point" — verify tiling at 50% offset' },
    }},
  ],

  promptFormulas: {
    'empty state': {
      structure: '[illustration style + line/fill spec] + [the metaphor for the empty state] + [palette as hex + description] + [composition: centered, breathing room] + [flat background matching UI surface] + [no text]',
      example: 'Flat minimal illustration, soft rounded shapes, 2px outlines. An open cardboard box with a single gently glowing document floating above it — "nothing here yet, add your first". Palette: slate #64748B lines, indigo #6366F1 accent, background #F8FAFC. Centered, generous negative space. No text.',
      perModel: {
        'nano-banana-pro': 'Explain the UI state and let it invent the metaphor: "empty state for an invoicing app, first-run, encouraging".',
        'seedream/5-lite-text-to-image': 'Specify the metaphor yourself; keep the style spec tight.',
      },
      pitfalls: [
        '"No text" always — models write garbled UI copy; real copy lives in the DOM.',
        'Background must match the UI surface color or the card edges show.',
        'One metaphor per state; two-idea illustrations confuse at 400px.',
      ],
    },
    'icon set': {
      structure: 'LOCKED PREFIX: "[style] icon, [stroke]px stroke, [hex], centered, white background, no text, no shadow" + per-icon subject noun',
      pitfalls: [
        'Reuse the prefix VERBATIM per icon — paraphrasing drifts the family.',
        'One icon per generation; grids come back inconsistent and un-croppable.',
        'Generate ~4x final size, crisp-upscale, then downscale in build.',
      ],
    },
    'hero or og:image': {
      structure: '[1200x630 og / hero aspect] + [product name text in quotes if baked] + [one visual concept] + [brand hex palette] + [safe margins: og crops edges on some surfaces]',
      pitfalls: ['og:images get edge-cropped by chat clients — keep text within an inner 80% safe zone.', 'Verify baked product-name text character-by-character.'],
    },
  },

  workflows: [
    { name: 'Empty-state family', steps: [
      'Write one style prefix from the design system (style, stroke, palette hex, background)',
      'seedream/5-lite-text-to-image per state: prefix + that state\'s metaphor',
      'Dark-mode pass: same prompts with swapped background/line hex',
      'recraft/remove-background if states float over varied surfaces',
    ]},
    { name: 'Icon family', steps: [
      'Lock the prefix; flux-2/flex-text-to-image one icon per call',
      'recraft/remove-background → recraft/crisp-upscale',
      'Downscale to 24/32/48px in the build pipeline; reject icons that muddy at 24px',
    ]},
    { name: 'Landing page kit', steps: [
      'Hero: flux-2/pro-text-to-image (text-free) or gpt-image/2 (baked headline)',
      'Feature spots: 3-5 via one locked prefix + per-feature metaphors',
      'og:image: gpt-image/2 with product name, safe-zone margins',
      'Seasonal refresh later: grok_image_edit whole-image mode on the hero',
    ]},
  ],

  qualityChecklist: [
    'Style matches the surrounding UI (screenshot the art in situ, not in isolation)',
    'Palette exactly on design-system hex; no rogue gradients',
    'No baked text anywhere except deliberate text-tier pieces — and those verified letter-by-letter',
    'Reads at actual render size (test at 100% zoom, not the generation size)',
    'Dark-mode variant genuinely dark-native, not inverted',
    'Icon family: consistent stroke weight, corner radius, optical size across the set',
    'og:image text inside the 80% safe zone',
  ],
}
