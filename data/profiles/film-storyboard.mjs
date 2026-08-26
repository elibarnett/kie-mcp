// Vertical profile: Film & Storyboarding (issue #91, Phase 2).
export default {
  id: 'film-storyboard',
  name: 'Film & Storyboarding',
  media: ['image'],
  summary: 'Storyboards, shot concepts, character/costume lookdev, set design, and mood frames — lens-language-aware, continuity-conscious.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What piece? (storyboard sequence / single shot concept / character-costume lookdev / set design / mood frame / poster-style key frame)', why: 'A 12-panel board and a single mood frame are opposite jobs: consistency-cheap-fast vs. one expensive perfect image.' },
    { key: 'format', ask: 'Frame aspect: 2.39:1 scope, 1.85:1, 16:9, or vertical?', why: 'Aspect is the film-ness; boards drawn 1:1 mislead blocking. Map to the closest supported ratio (16:9) and note the crop.' },
    { key: 'shot_grammar', ask: 'For each shot: shot size (ECU/CU/MS/WS), angle, and lens feel (wide 24mm distortion vs long-lens 85mm compression)?', why: 'Lens language IS the craft. "Wide shot, low angle, 24mm" produces a different drawing than an unspecified view.' },
    { key: 'continuity', ask: 'Recurring characters/sets that must stay consistent across panels?', why: 'Consistency routes to ideogram/character with a locked reference; free generation drifts faces panel to panel.' },
    { key: 'style', ask: 'Board style: loose pencil/marker (classic), clean line, or fully rendered frames?', why: 'Classic boards are DELIBERATELY loose — directors read blocking, not rendering. Over-rendered boards slow revision cycles.' },
    { key: 'grade', ask: 'For mood frames: era/genre grade? (teal-orange blockbuster, bleach-bypass war, warm 70s Kodak, neon noir)', why: 'The grade carries genre; naming a film stock or grading convention beats adjectives.' },
    { key: 'blocking', ask: 'Who is in frame, where, moving which direction? (screen direction matters)', why: 'Boards exist to communicate blocking and eyelines; models put characters anywhere unless told left/right explicitly.' },
  ],

  routing: [
    { deliverable: 'storyboard sequence', tiers: {
        default: { model: 'qwen3/text-to-image', note: 'prompt_extend OFF; "loose pencil storyboard panel" style; cheap enough for 20-panel passes' },
        consistent_cast: { model: 'ideogram/character', note: 'lock the lead from one reference, per-panel prompts carry shot grammar only' },
        value: { model: 'seedream/5-lite-text-to-image', note: 'slightly more rendered marker style' },
    }},
    { deliverable: 'single shot concept', tiers: {
        draft: { model: 'nano-banana-2-lite', note: '' },
        final: { model: 'nano-banana-pro', note: 'reasons about staging, practical lighting sources, and lens behavior' },
    }},
    { deliverable: 'character-costume lookdev', tiers: {
        default: { model: 'seedream/4.5-text-to-image', note: 'costume turnaround sheets' },
        consistent_set: { model: 'ideogram/character', note: 'same face across costume options' },
    }},
    { deliverable: 'set design', tiers: {
        default: { model: 'nano-banana-pro', note: 'architectural logic + practical light sources; ask for "production design concept"' },
        value: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose splits set/foreground for over-shoulder comps' },
    }},
    { deliverable: 'mood frame', tiers: {
        final: { model: 'nano-banana-pro', note: 'the money image; full grade + atmosphere language' },
        iterate: { tool: 'grok_image_edit', note: 'regrade/relight an approved frame (whole-image mode) instead of regenerating' },
    }},
  ],

  promptFormulas: {
    'storyboard sequence': {
      structure: 'PER PANEL: "storyboard panel, loose pencil, [aspect]" + [shot size + angle + lens] + [who, where in frame, facing which direction] + [action beat in one clause] + [arrow/motion notes if needed]',
      example: 'Storyboard panel, loose pencil sketch, 2.39:1 letterbox. Wide shot, low angle, 24mm. The detective enters frame left, walking toward a lit doorway frame right, long shadow ahead of him. Rain streaks. Motion arrow following his path.',
      perModel: {
        'qwen3/text-to-image': 'prompt_extend OFF or panels get over-rendered; repeat the style clause verbatim every panel.',
        'ideogram/character': 'Reference locks the face; the per-panel prompt should ONLY carry shot grammar + action.',
      },
      pitfalls: [
        'Screen direction: say "frame left/right", never just "left" — and keep it consistent across a scene or you cross the line.',
        'One action beat per panel; two-beat panels read as confusion.',
        'Fight the model\'s urge to render: repeat "loose sketch, no shading detail".',
      ],
    },
    'mood frame': {
      structure: '[shot size + lens + camera height] + [subject + blocking] + [set/location + period detail] + [light sources named practically] + [grade: stock/convention] + [atmosphere: haze, rain, dust]',
      pitfalls: [
        'Name light SOURCES ("sodium streetlight camera left, cool moonlight fill") not just mood words.',
        'Grade via convention or stock ("bleach-bypass", "Kodak 2383 print look") — "cinematic" alone is noise.',
        'Atmosphere (haze/smoke) is what makes frames filmic; ask for it explicitly.',
      ],
    },
    'set design': {
      structure: '"Production design concept, [wide/establishing] view" + [space + period + condition (lived-in/derelict/pristine)] + [practical light sources in the set] + [where the camera would play] + [texture/prop storytelling]',
      pitfalls: ['"Lived-in" detail must be asked for — default sets come back showroom-clean.', 'State where practicals are; sets without motivated light sources can\'t be lit later.'],
    },
  },

  workflows: [
    { name: 'Scene board pass', steps: [
      'Write the shot list first (size/angle/lens per shot) — boards are drawings of a shot list, not of a script',
      'ideogram/character lock for the lead if faces recur',
      'qwen3/text-to-image per panel with the locked style clause',
      'Revise only the panels the director flags — cheap tier makes redraws free-ish',
    ]},
    { name: 'Pitch mood set', steps: [
      '3-5 mood frames at nano-banana-pro covering the film\'s looks (day ext, night int, climax)',
      'grok_segment_map + grok_image_edit for regrade variants of the same frame (free segment, 4cr per regrade)',
      'recraft/crisp-upscale for the pitch deck',
    ]},
    { name: 'Board → animatic handoff', steps: [
      'Export panels in shot order with consistent aspect',
      'Video step lives in the video registry (kling-3-omni multi_prompt maps 1:1 to a shot list) — out of profile scope but the natural next step',
    ]},
  ],

  qualityChecklist: [
    'Aspect consistent across every panel',
    'Screen direction consistent within scenes (no accidental line crosses)',
    'Shot grammar readable: a stranger can name the shot size from the drawing',
    'Recurring characters recognizably the same person across panels',
    'Mood frames: motivated light sources, era-correct props, atmosphere present',
    'Boards loose enough to invite revision, not presentation art',
  ],
}
