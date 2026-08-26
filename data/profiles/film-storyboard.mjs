// Vertical profile: Film & Storyboarding (issue #91).
// Expert-reviewed 2026-08-27 (board artist/previs supervisor + web research):
// true-21:9 handling (never prompt letterbox), NB2 reference-driven boards,
// panel numbering, eyeline matching, clean-frame animatic handoff.
export default {
  id: 'film-storyboard',
  name: 'Film & Storyboarding',
  media: ['image'],
  summary: 'Storyboards, shot concepts, character/costume lookdev, set design, and mood frames — lens-language-aware, continuity-conscious.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What piece? (storyboard sequence / single shot concept / character-costume lookdev / set design / mood frame / poster-style key frame)', why: 'A 12-panel board and a single mood frame are opposite jobs: consistency-cheap-fast vs. one expensive perfect image.' },
    { key: 'purpose', ask: 'Who is this for: the director\'s editorial tool, a pitch deck, or on-set crew handout?', why: 'This — not taste — decides loose-vs-rendered. Editorial boards stay loose to invite revision; pitch decks earn rendering.' },
    { key: 'format', ask: 'Frame aspect: 2.39:1 scope, 1.85:1, 16:9, or vertical?', why: 'Scope maps to TRUE 21:9 on models that support it (nano-banana family, gpt-image-2, seedream/4.5, seedream/5-lite); qwen3 and ideogram/character top out at 16:9 — flag the compromise or reroute. NEVER prompt "letterbox".' },
    { key: 'numbering', ask: 'Scene/shot numbering scheme? (Sc 12 / Sh 4A — or derive from the shot list)', why: 'Boards are meeting documents; unnumbered panels cannot be discussed or revised.' },
    { key: 'shot_grammar', ask: 'For each shot: shot size (ECU/CU/MS/WS), angle, and lens feel (wide 24mm distortion vs long-lens 85mm compression)?', why: 'Lens language IS the craft.' },
    { key: 'continuity', ask: 'Recurring characters/sets that must stay consistent? How many recurring characters per scene?', why: 'One face-forward lead → ideogram/character; two-handers and wardrobe continuity → nano-banana-2 with labeled per-character references (wardrobe IS continuity, and single-ref face lock does not hold it).' },
    { key: 'style', ask: 'Board style: loose pencil/marker (classic), clean line, or fully rendered frames?', why: 'Classic boards are DELIBERATELY loose — directors read blocking, not rendering.' },
    { key: 'blocking', ask: 'Who is in frame, where, moving which direction — and does the camera move (pan/push-in/dolly)?', why: 'Boards communicate blocking, eyelines, and camera movement (arrows, frame-in-frame); models put characters anywhere unless told frame-left/frame-right.' },
  ],

  routing: [
    { deliverable: 'storyboard sequence', tiers: {
        default: { model: 'nano-banana-2-lite', note: '4 cr, ~4s, true 21:9, up to 10 reference images — carry the character sheet into every panel; the default for scope-format or reference-driven boards' },
        budget_16x9: { model: 'qwen3/text-to-image', note: 'prompt_extend OFF, negative_prompt "shading, rendering, detail", pin seed for panel revisions; 16:9 max' },
        consistent_cast: { model: 'nano-banana-2', note: 'two-plus recurring characters: labeled reference images per character, wardrobe included' },
        single_lead: { model: 'ideogram/character', note: 'locks ONE face from one ref; clothing/accessories drift — re-specify wardrobe per panel; expand_prompt: false or panels over-render' },
    }},
    { deliverable: 'single shot concept', tiers: {
        draft: { model: 'nano-banana-2-lite', note: '' },
        mid: { model: 'nano-banana-2', note: '4 cr, refs, 21:9 — the workhorse' },
        final: { model: 'nano-banana-pro', note: 'staging/lighting reasoning; verify output (degradation windows)' },
    }},
    { deliverable: 'character-costume lookdev', tiers: {
        default: { model: 'seedream/4.5-text-to-image', note: 'costume turnaround sheets' },
        consistent_set: { model: 'nano-banana-2', note: 'same face across costume options via references' },
    }},
    { deliverable: 'set design', tiers: {
        default: { model: 'nano-banana-pro', note: 'architectural logic + practical light sources; "production design concept"; verify output' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose splits set/foreground for over-shoulder comps' },
    }},
    { deliverable: 'mood frame', tiers: {
        final: { model: 'nano-banana-pro', note: 'the money image; full grade + atmosphere language; verify output' },
        iterable: { model: 'grok-imagine-image-2-0/text-to-image', note: 'generate HERE (4 cr) when regrade/variant rounds are planned — unlocks free segment → 4 cr region edits (the chain only works on grok-generated frames)' },
        regrade_foreign: { tool: 'grok_image_edit', note: 'whole-image regrade of an uploaded/foreign frame' },
    }},
  ],

  promptFormulas: {
    'storyboard sequence': {
      structure: 'PER PANEL: "storyboard panel, loose pencil" + TRUE aspect via the API param (21:9 for scope — never ask for letterbox in the prompt) + [shot size + angle + lens] + [who, where in frame, facing which direction] + [action beat in one clause] + [camera-move arrows if any]',
      example: 'Storyboard panel, loose pencil sketch. Wide shot, low angle, 24mm. The detective enters frame left, walking toward a lit doorway frame right, long shadow ahead of him. Rain streaks. Motion arrow following his path. (Generated at 21:9 via aspect_ratio — not drawn letterbox.)',
      perModel: {
        'nano-banana-2-lite': 'Attach the character sheet as reference images every panel; per-panel prompt carries only shot grammar + action.',
        'qwen3/text-to-image': 'prompt_extend OFF; fight rendering with negative_prompt, not prose; seed-pin for revisions.',
        'ideogram/character': 'expand_prompt: false (MagicPrompt over-renders loose panels exactly like qwen\'s prompt_extend).',
      },
      pitfalls: [
        'NEVER prompt "2.39:1 letterbox" — the model PAINTS black bars into a 16:9 image, poisoning upscale, reframe, and image-to-video handoff. Use the real aspect param.',
        'Screen direction: "frame left/right", consistent within a scene (the 180° line).',
        'Eyeline match on shot/reverse-shot pairs — the most common director note; screen direction alone does not catch it.',
        'One action beat per panel.',
        'Number every panel (Sc/Sh) — in the filename or margin, not baked gibberish.',
      ],
    },
    'mood frame': {
      structure: '[shot size + lens + camera height] + [subject + blocking] + [set/location + period detail] + [light sources named practically] + [grade: stock/convention — teal-orange, bleach-bypass, warm 70s Kodak, neon noir] + [atmosphere: haze, rain, dust]',
      pitfalls: [
        'Name light SOURCES ("sodium streetlight camera left, cool moonlight fill"), not mood words.',
        'Grade via convention or stock — "cinematic" alone is noise.',
        'Atmosphere (haze/smoke) is what makes frames filmic; ask explicitly.',
      ],
    },
    'set design': {
      structure: '"Production design concept, [wide/establishing] view" + [space + period + condition (lived-in/derelict/pristine)] + [practical light sources in the set] + [where the camera would play] + [texture/prop storytelling]',
      pitfalls: ['"Lived-in" must be asked for — default sets come back showroom-clean.', 'State where practicals are; sets without motivated sources cannot be lit later.'],
    },
  },

  workflows: [
    { name: 'Character sheet first (the 2026 standard)', steps: [
      'Approve a turnaround/reference sheet per recurring character (seedream/4.5 or lookdev tier) BEFORE any panel',
      'Feed the sheet as reference images to every panel generation (nano-banana-2-lite/2)',
      'Wardrobe changes get their own sheet — wardrobe is continuity',
    ]},
    { name: 'Scene board pass', steps: [
      'Write the shot list first (size/angle/lens per shot) — boards are drawings of a shot list',
      'Generate panels with character sheets attached, numbered per the scheme',
      'Revise only flagged panels (seed-pinned or reference-anchored redraws are cheap)',
    ]},
    { name: 'Pitch mood set', steps: [
      'Generate 3-5 frames covering the film\'s looks on grok-imagine-image-2-0 (4 cr each) if regrade variants are planned, else nano-banana-pro',
      'Grok-generated frames: grok_segment_map (free) + grok_image_edit per regrade variant',
      'recraft/crisp-upscale for the deck',
    ]},
    { name: 'Board → animatic handoff', steps: [
      'Keep TWO exports per panel: annotated (arrows, numbers) for meetings, CLEAN for downstream',
      'Feed clean frames to image-to-video (panel N and N+1 as first/last frame — the video registry\'s interpolation models); baked annotations poison the animatic',
    ]},
  ],

  qualityChecklist: [
    'True aspect from the API — no painted letterbox bars anywhere',
    'Panels numbered per the scheme; annotated AND clean exports exist',
    'Screen direction consistent within scenes; eyelines match on reverse pairs',
    'Shot grammar readable: a stranger can name the shot size from the drawing',
    'Recurring characters recognizable AND wardrobe/prop continuity holds across panels',
    'Mood frames: motivated light sources, era-correct props, atmosphere present',
    'Boards loose enough to invite revision when the purpose is editorial',
  ],
}
