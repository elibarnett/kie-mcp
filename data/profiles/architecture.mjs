// Vertical profile: Architecture & Interior Design (issue #91).
// Profiles brief the CALLING AGENT — they are knowledge, not interrogation
// scripts. The agent asks only the intake questions the user's request leaves
// unanswered, then compiles answers using the prompt formulas below.

export default {
  id: 'architecture',
  name: 'Architecture & Interior Design',
  media: ['image'],
  summary: 'Exterior/interior renders, elevations, site plans, concept sketches, material boards — with the questions an architect would ask first.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What kind of drawing? (exterior render / interior render / elevation or section / site plan / concept sketch / material board)', why: 'Drives model choice, prompt formula, and whether photorealism matters at all.' },
    { key: 'purpose', ask: 'Client presentation, planning submission, or internal concept?', why: 'Presentation wants photoreal + entourage; planning wants sober accuracy; concept tolerates looseness and benefits from cheaper draft tiers.' },
    { key: 'camera', ask: 'Camera: eye-level (1.6m), elevated 3/4, aerial, or axonometric? Wide or normal lens feel?', appliesTo: ['exterior render', 'interior render'], why: 'The single biggest realism lever. Eye-level + corrected verticals reads professional; unspecified cameras produce drone-ish nowhere views.' },
    { key: 'light', ask: 'Time of day, season, weather? (e.g. golden hour autumn, overcast winter, dusk with interior lights on)', appliesTo: ['exterior render', 'interior render'], why: 'Light is the mood. Dusk shots sell warmth (interior glow); overcast flattens material contrast; hard noon sun is rarely flattering.' },
    { key: 'materials', ask: 'Name the material palette explicitly (e.g. "board-formed concrete, blackened cedar cladding, zinc roof, oak interiors").', why: 'Models hallucinate cladding. Unnamed materials come back as generic render-stucco. This is the most common failure in architectural gen.' },
    { key: 'style', ask: 'Style era or precedent? (brutalist, mid-century, Scandinavian, a named architect as reference, or "as drawn — no styling")', why: 'Anchors massing and detailing vocabulary; "no styling" matters when the design is already fixed and only visualization is wanted.' },
    { key: 'context', ask: 'Site context: urban infill, suburban, rural, coastal? Neighbors visible?', appliesTo: ['exterior render', 'site plan'], why: 'Context sells believability; context-free buildings float in limbo.' },
    { key: 'entourage', ask: 'People, cars, vegetation in shot — and how much?', appliesTo: ['exterior render', 'interior render'], why: 'Presentation renders usually want sparse, believable entourage; models over-populate unless told.' },
    { key: 'interior_specifics', ask: 'Ceiling height, floor level, and what the window view shows?', appliesTo: ['interior render'], why: 'Interior scale errors (4m-tall doors) are the telltale AI artifact; the view out the window grounds the space.' },
    { key: 'reference', ask: 'Do you have plans, massing screenshots, or sketches to work from? (upload_file → image-to-image)', why: 'A reference image moves the job from imagination to visualization — different models and much higher fidelity to the actual design.' },
  ],

  routing: [
    { deliverable: 'exterior render', tiers: {
        draft: { model: 'nano-banana-2-lite', note: 'iterate composition/light cheaply, 4-variant batches' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'strong design register; pair with seedream_layer_decompose to get sky/building/foreground as editable layers' },
        final: { model: 'nano-banana-pro', note: 'best material fidelity and reasoning about structure; prose prompts' },
        from_reference: { tool: 'grok_image_edit', note: 'whole-image mode: upload massing/sketch via upload_file, instruct the render treatment' },
    }},
    { deliverable: 'interior render', tiers: {
        draft: { model: 'nano-banana-2-lite', note: 'layout studies' },
        value: { model: 'seedream/5-pro-text-to-image', note: '' },
        final: { model: 'nano-banana-pro', note: 'handles furniture scale + window views best' },
        from_reference: { model: 'flux-kontext-pro', note: 'surgical edits on existing interior photos (staging swaps, material changes)' },
    }},
    { deliverable: 'elevation or section', tiers: {
        default: { model: 'qwen3/text-to-image', note: 'prompt_extend OFF; ask for "flat orthographic architectural elevation, line drawing, no perspective"' },
        final: { model: 'gpt-image/2-text-to-image', note: 'when annotations/dimension text must render legibly' },
    }},
    { deliverable: 'site plan', tiers: {
        default: { model: 'nano-banana-pro', note: 'reasons about plan logic (access, orientation) better than cheaper tiers' },
    }},
    { deliverable: 'concept sketch', tiers: {
        default: { model: 'qwen3/text-to-image', note: '"loose charcoal/ink architectural sketch" styles; prompt_extend off for control' },
        value: { model: 'seedream/5-lite-text-to-image', note: 'painterly concept style' },
    }},
    { deliverable: 'material board', tiers: {
        default: { model: 'nano-banana-pro', note: 'multi-image composition: pass swatch references via image_urls' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'grid-layout board from named materials; layer-decompose splits swatches after' },
    }},
  ],

  promptFormulas: {
    'exterior render': {
      structure: '[camera + lens + "verticals corrected"] + [massing in one sentence] + [materials, named] + [site context] + [light: time/season/weather] + [entourage level] + [mood/precedent]',
      example: 'Eye-level exterior photograph, 28mm, two-point perspective with corrected verticals. A low two-storey L-shaped house of board-formed concrete and blackened cedar, deep roof overhangs in zinc. Rural hillside site with native grasses, gravel approach. Golden hour, late autumn, long shadows. One figure at the entry, no cars. Calm, Scandinavian-modern photographic mood.',
      perModel: {
        'nano-banana-pro': 'Narrative prose; let it reason ("the cedar volume cantilevers over the concrete base") — it rewards structural logic.',
        'seedream/5-pro-text-to-image': 'Design-brief register: state program, materials, and mood like a project sheet.',
        'nano-banana-2-lite': 'Shorter, concrete sentences; drop the mood poetry, keep camera + materials + light.',
      },
      pitfalls: [
        'Say "verticals corrected / two-point perspective" or you get converging keystoned towers.',
        'Name every visible material; unnamed surfaces become render-stucco.',
        'Ask for "photograph" not "render" when you want photorealism — "render" pulls toward CGI sheen.',
        'Entourage inflates unless bounded ("one figure", "no cars").',
      ],
    },
    'interior render': {
      structure: '[camera height + lens, "eye-level 1.5m"] + [room + ceiling height + floor] + [materials + furniture era] + [window view content] + [light source mix] + [staging density]',
      pitfalls: [
        'State ceiling height ("2.7m ceilings") — scale drift is the #1 interior artifact.',
        'Describe what is OUT the window; empty white glow reads fake.',
        'Mixed light ("daylight from the left, warm pendant over the table") beats single-source.',
      ],
    },
    'elevation or section': {
      structure: '"Flat orthographic architectural [elevation/section], no perspective, line drawing" + [facade description left-to-right] + [material hatching notes] + [scale figures y/n]',
      pitfalls: ['Models fight orthographic projection — repeat "flat, no perspective, no vanishing point".', 'Dimension text will be gibberish below the text-rendering tier (gpt-image-2/ideogram).'],
    },
  },

  workflows: [
    { name: 'Client presentation set', steps: [
      'Draft 4 composition/light variants on the draft tier',
      'Pick winner with the client language ("option B, but dusk")',
      'Regenerate hero at final tier with the full formula',
      'seedream_layer_decompose the hero → sky/building/foreground layers for post tweaks',
      'recraft/crisp-upscale for print or large-format decks',
    ]},
    { name: 'Sketch-to-render ladder', steps: [
      'upload_file the hand sketch or massing screenshot',
      'grok-imagine-image-2-0/image-edit whole-image mode: "photorealistic architectural photograph of this exact massing, [materials], [light]"',
      'Iterate materials/light on the result via another whole-image edit round',
    ]},
    { name: 'Material board', steps: [
      'Collect swatch refs (upload_file each, or let the model imagine from names)',
      'nano-banana-pro multi-image composition: "presentation material board, labeled swatches: [list]"',
      'gpt-image/2 pass if labels must be typographically clean',
    ]},
  ],

  qualityChecklist: [
    'Verticals vertical (no keystoning) on exteriors',
    'Materials match the named palette — check cladding first, it drifts most',
    'Shadows consistent with the stated time of day and single sun direction',
    'Interior scale: door ≈ 2.1m against ceiling height, furniture believable',
    'Window views populated, not glowing voids',
    'Entourage sparse and scale-correct',
  ],
}
