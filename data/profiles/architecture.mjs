// Vertical profile: Architecture & Interior Design (issue #91).
// Expert-reviewed 2026-08-27 (senior archviz practitioner + web research):
// routing rebalanced to gpt-image-2 edit / NB2 defaults, NB-Pro degradation
// caveats, geometry-fidelity intake, virtual staging + day-to-dusk workflows.
export default {
  id: 'architecture',
  name: 'Architecture & Interior Design',
  media: ['image', 'video'],
  summary: 'Exterior/interior renders, renovation previews, elevations, site plans, sketches, material boards — with the questions an architect would ask first.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What kind of drawing? (exterior render / interior render / renovation preview from a photo / virtual staging / elevation or section / site plan / concept sketch / material board)', why: 'Drives model choice, prompt formula, and whether photorealism matters at all.' },
    { key: 'purpose', ask: 'Client presentation, planning submission, or internal concept?', why: 'Presentation wants photoreal; planning wants sober accuracy — and AI output is ILLUSTRATIVE, never dimensionally accurate: warn explicitly before anything touches a planning submission.' },
    { key: 'geometry_fidelity', ask: 'Is the geometry fixed (must match drawings) or interpretable?', why: 'Sets the core expectation. AI enriches schemes — lusher landscaping, invented facade articulation. If the design is contractual, every view needs a fidelity check against the drawings.' },
    { key: 'output_spec', ask: 'Screen or print? What size/ratio? How many views, and must they show the same building consistently?', why: 'Print needs upscale headroom (disqualifies 1K-only tiers); multi-view sets need a consistency plan (i2i from a hero view, or seed-pinning) — cross-view consistency is a top AI weakness.' },
    { key: 'camera', ask: 'Camera: eye-level (1.6m), elevated 3/4, aerial, or axonometric? Wide or normal lens feel?', appliesTo: ['exterior render', 'interior render'], why: 'The single biggest realism lever. Eye-level + corrected verticals reads professional; unspecified cameras produce drone-ish nowhere views.' },
    { key: 'light', ask: 'Time of day, season, weather? (e.g. golden hour autumn, overcast winter, dusk with interior lights on)', appliesTo: ['exterior render', 'interior render'], why: 'Light is the mood. Dusk sells warmth; overcast flattens material contrast; hard noon sun is rarely flattering.' },
    { key: 'materials', ask: 'Name the material palette explicitly (e.g. "board-formed concrete, blackened cedar cladding, zinc roof, oak interiors").', why: 'Models hallucinate cladding. Unnamed materials come back as generic render-stucco — the most common failure in architectural gen.' },
    { key: 'style', ask: 'Style era or precedent? (brutalist, mid-century, Scandinavian, a named architect, or "as drawn — no styling")', why: 'Anchors massing and detailing vocabulary; "no styling" matters when the design is fixed and only visualization is wanted.' },
    { key: 'site_staging', ask: 'Site context (urban infill, suburban, rural, coastal — neighbors visible?) and staging: people, cars, vegetation, how much?', appliesTo: ['exterior render', 'interior render', 'site plan'], why: 'Context sells believability; entourage inflates unless bounded ("one figure, no cars").' },
    { key: 'interior_specifics', ask: 'Ceiling height, floor level, and what the window view shows?', appliesTo: ['interior render', 'virtual staging'], why: 'Interior scale errors (4m doors) are the telltale AI artifact; the view out the window grounds the space.' },
    { key: 'reference', ask: 'Do you have plans, massing screenshots, sketches, or photos to work from? (upload_file → image-to-image)', why: 'A reference moves the job from imagination to visualization — different routing and much higher fidelity to the actual design.' },
    { key: 'reno_changes', ask: 'For renovation previews: list each change with its EXACT material/finish (e.g. "carpet → wide-plank European oak, matte"), one by one.', appliesTo: ['renovation preview'], why: 'The edit model executes a change-list; vague "modernize" instructions make it invent a different room.' },
    { key: 'reno_keep', ask: 'What must stay exactly as photographed? (furniture, window, layout, the camera itself)', appliesTo: ['renovation preview'], why: 'The preserve clause is what keeps the client\'s room being THEIR room — the single highest-leverage sentence in the prompt.' },
  ],

  routing: [
    { deliverable: 'exterior render', tiers: {
        draft: { model: 'nano-banana-2', note: 'production default — same 4 cr as Lite, 4K-capable, up to 14 reference images; use Lite only when latency matters, z-image (3 cr) is the true floor' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'design-brief register; layer-decompose gives sky/building/foreground layers. Days-old on kie — treat as experimental' },
        final: { model: 'nano-banana-pro', note: 'best material fidelity BUT has documented quality-degradation windows — verify the hero before delivery' },
        final_alt: { model: 'flux-2/pro-text-to-image', note: 'pure-photorealism alternative final; cheaper and no degradation reports' },
    }},
    { deliverable: 'interior render', tiers: {
        draft: { model: 'nano-banana-2', note: '' },
        final: { model: 'nano-banana-pro', note: 'furniture scale + window views; verify (degradation windows)' },
        from_reference: { model: 'gpt-image/2-image-to-image', note: 'multi-ref killer feature: room photo + furniture product shots composited with correct lighting (up to 16 refs)' },
        surgical: { model: 'flux-kontext-pro', note: 'single-element pixel-faithful swaps on existing photos' },
    }},
    { deliverable: 'renovation preview', tiers: {
        default: { model: 'gpt-image/2-image-to-image', note: '#1 Arena editor; wins multi-element change-sets with preserve clauses, 8 cr — the reno default' },
        pixel_faithful: { model: 'flux-kontext-pro', note: 'single surgical swap where pixel fidelity is absolute (50 cr; 512-token prompt cap — keep change-lists short)' },
        bold_restyle: { tool: 'grok_image_edit', note: 'whole-image mode, 4 cr — bold restyles where fidelity matters less' },
        aspirational: { model: 'nano-banana-2', note: 'JSON scene-spec lane: agent reads the photo → detailed JSON (room, materials, lighting, camera) → edit fields → regenerate with the photo as reference. Wins multi-change completeness + polish; LOSES pixel identity (re-renders). Offer alongside the faithful edit, not instead.' },
    }},
    { deliverable: 'virtual staging', tiers: {
        default: { model: 'gpt-image/2-image-to-image', note: 'empty room photo + furniture reference shots → staged room; the bread-and-butter real-estate job' },
        budget: { tool: 'grok_image_edit', note: 'whole-image mode with staging instructions, 4 cr' },
    }},
    { deliverable: 'elevation or section', tiers: {
        default: { model: 'qwen3/text-to-image', note: 'prompt_extend OFF, pin seed to iterate a fixed composition; "flat orthographic architectural elevation, line drawing, no perspective"' },
        final: { model: 'gpt-image/2-text-to-image', note: 'when annotations/dimension text must render legibly' },
    }},
    { deliverable: 'site plan', tiers: {
        labeled: { model: 'gpt-image/2-text-to-image', note: 'plans need legible labels — text tier required' },
        unlabeled: { model: 'nano-banana-2', note: '4 cr; NB-Pro not justified here' },
    }},
    { deliverable: 'concept sketch', tiers: {
        default: { model: 'qwen3/text-to-image', note: '"loose charcoal/ink architectural sketch"; prompt_extend off' },
        value: { model: 'seedream/5-lite-text-to-image', note: 'painterly concept style' },
    }},
    { deliverable: 'material board', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'labeled grid boards — label legibility is the point' },
        composed: { model: 'nano-banana-pro', note: 'multi-image composition from uploaded swatch references' },
    }},
    { deliverable: 'walkthrough video', tiers: {
        default: { model: 'pixverse-v6/image-to-video', note: 'animate the APPROVED still — slow push-in or gentle orbit; the still carries the design, the video only adds motion' },
        draft: { model: 'wan/flash-image-to-video', note: '6-8 cr/s motion tests' },
        multi_room_tour: { model: 'kling-3-omni/image-to-video', note: 'per-shot scripted tour via multi_prompt — one approved still per room' },
        hero: { model: 'veo-3/image-to-video', note: '50 cr/s cinematic final with ambient audio — client-presentation money shot only' },
    }},
  ],

  promptFormulas: {
    'exterior render': {
      structure: '[camera + lens + "verticals corrected"] + [massing in one sentence] + [materials, named] + [site context] + [light: time/season/weather] + [staging level] + [mood/precedent]',
      example: 'Eye-level exterior photograph, 28mm, two-point perspective with corrected verticals. A low two-storey L-shaped house of board-formed concrete and blackened cedar, deep roof overhangs in zinc. Rural hillside site with native grasses, gravel approach. Golden hour, late autumn, long shadows. One figure at the entry, no cars. Calm, Scandinavian-modern photographic mood.',
      perModel: {
        'nano-banana-pro': 'Narrative prose; let it reason about structure — and verify the output (documented degradation windows).',
        'nano-banana-2': 'Concrete sentences: camera + materials + light. Pass style/site references as images — refs beat adjectives.',
        'flux-2/pro-text-to-image': 'Straight photographic language; it leads pure photorealism.',
      },
      pitfalls: [
        'Say "verticals corrected / two-point perspective" or you get keystoned towers.',
        'Name every visible material; unnamed surfaces become render-stucco.',
        'Ask for "photograph" not "render" for photorealism — "render" pulls toward CGI sheen.',
        'AI ENRICHES the scheme: lusher planting, extra facade articulation the design never had. Check against drawings when geometry is contractual.',
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
    'renovation preview': {
      structure: '[change 1 with exact material] + [change 2...] + [removals stated as removals] + PRESERVE CLAUSE: "Keep everything else exactly unchanged: the same camera angle, [window/light], [each kept furniture piece], [ceiling/lighting]"',
      example: 'Replace the wall-to-wall carpet with wide-plank European oak flooring, matte finish, planks running toward the window. Repaint walls warm off-white. Remove the TV cabinet. Install a floor-to-ceiling black steel-framed glass partition in the hallway opening. Keep everything else exactly unchanged: the same camera angle, the window and daylight, the leather sofa, the coffee table, ceiling and lighting.',
      perModel: {
        'gpt-image/2-image-to-image': 'Label references ("image 1 = the room"); "change only X, preserve all other pixels". Handles multi-element change-sets best.',
        'flux-kontext-pro': 'Pure instruction register, ONE change-set, short (512-token cap) — never describe the whole room.',
        'nano-banana-2': 'JSON lane: fields marked unchanged anchor the regeneration; expect a re-render, not a pixel edit — camera may move despite instructions.',
      },
      pitfalls: [
        'The preserve clause is mandatory — without it the model hallucinates new geometry (moved windows, phantom rooms).',
        'One coherent change-set per pass; iterate floor+walls first, joinery second.',
        'Name materials exactly per change; "modernize" is an invitation to invent.',
        'Verify structural sanity after: same window positions and count, same openings, same proportions.',
      ],
    },
    'elevation or section': {
      structure: '"Flat orthographic architectural [elevation/section], no perspective, line drawing" + [facade description left-to-right] + [material hatching notes] + [scale figures y/n]',
      pitfalls: ['Models fight orthographic projection — repeat "flat, no perspective, no vanishing point".', 'Dimension text is gibberish below the text tier (gpt-image-2).', 'Pin qwen3\'s seed to iterate the same composition.'],
    },
    'material board': {
      structure: '"Presentation material board, labeled grid" + [swatch list with names in quotes] + [board style: clean white, generous margins]',
      pitfalls: ['Labels in quotes, verified letter-by-letter.', 'Pass real swatch photos as references when exact materials matter.'],
    },
  },

  workflows: [
    { name: 'Client presentation set', steps: [
      'Draft 4 composition/light variants on nano-banana-2',
      'Pick winner with the client language ("option B, but dusk")',
      'Hero at final tier — verify against drawings (NB-Pro degradation + AI enrichment)',
      'seedream_layer_decompose the hero → sky/building/foreground layers for post tweaks',
      'recraft/crisp-upscale for decks; topaz/image-upscale for large-format print',
    ]},
    { name: 'Renovation preview from client photo', steps: [
      'upload_file the client photo (file_path mode)',
      'Intake: change-list with exact materials + the keep-list',
      'Faithful lane: gpt-image/2-image-to-image with change-list + preserve clause',
      'Optional aspirational lane: agent writes a JSON scene spec, edits the change fields, regenerates on nano-banana-2 with the photo as reference (label it "concept, not exact")',
      'Present before/after side by side',
    ]},
    { name: 'Virtual staging (empty room)', steps: [
      'upload_file the empty-room photo plus furniture reference shots',
      'gpt-image/2-image-to-image: compose the furniture references into the room, matching light direction',
      'Iterate placement/pieces; keep camera language identical each round',
    ]},
    { name: 'Day-to-dusk conversion', steps: [
      'upload_file the daytime exterior photo',
      'grok_image_edit whole-image (4 cr): "convert to dusk: deep blue sky, warm interior lights glowing in every window, exterior lights on, keep everything else identical"',
      'A standard paid real-estate service — twilight listings get dramatically more clicks',
    ]},
    { name: 'Material-option matrix', steps: [
      'Lock the hero view',
      'gpt-image/2-image-to-image per option: "same view, cladding option B: [material]" — or the JSON lane, swapping only the materials fields',
      'Present A/B/C grid for the client decision',
    ]},
    { name: 'Sketch-to-render ladder', steps: [
      'upload_file the hand sketch or massing screenshot',
      'nano-banana-2 with the sketch as reference: "photorealistic architectural photograph of this exact massing, exact same camera angle, maintain proportions and layout, [materials], [light]"',
      'Iterate materials/light on the result; grok_image_edit whole-image is the 4 cr budget alt',
    ]},
  ],

  qualityChecklist: [
    'Verticals vertical (no keystoning); facade lines straight, no bent walls or warped frames',
    'Materials match the named palette — check cladding first; texture scale sane (brick courses, plank width), no repeating tile seams',
    'Window COUNT and mullion spacing match the design; shadows consistent with stated time of day',
    'Stair geometry plausible (tread count, rise, continuous railings) — the classic AI tell',
    'Interior scale: door ≈ 2.1m vs ceiling height; window views populated, not glowing voids',
    'Reflections contain only things present in the scene',
    'Text/labels legible, not gibberish (plans, boards)',
    'Cross-view consistency when delivering a set (same building everywhere)',
    'Geometry-fidelity pass against drawings when the design is contractual — AI enrichment removed or disclosed',
  ],
}
