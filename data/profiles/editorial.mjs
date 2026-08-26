// Vertical profile: Editorial & Publishing (issue #91, Phase 2).
export default {
  id: 'editorial',
  name: 'Editorial & Publishing',
  media: ['image'],
  summary: 'Article art, book covers, spot illustrations, infographic bases, and series-consistent publication imagery — tone-calibrated, layout-aware.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What piece? (article hero / spot illustration / book cover / section header set / infographic base / caricature-portrait style)', why: 'A 1600px web hero and a print book cover have opposite constraints; spots must read at 300px.' },
    { key: 'subject_angle', ask: 'What is the piece ABOUT, and what is the article\'s angle? (a story about AI regulation ≠ a story about AI hype — the illustration argues the angle)', why: 'Editorial art is commentary, not decoration. The metaphor must match the thesis or it fights the text.' },
    { key: 'publication_voice', ask: 'Publication style: conceptual-clever (New Yorker-ish), data-serious (economist-style), warm-literary, tech-clean, tabloid-bold?', why: 'House style is identity; naming an adjacent publication register works better than adjectives.' },
    { key: 'sensitivity', ask: 'Sensitive topic? (politics, health, tragedy, identifiable people)', why: 'Real people must not be depicted photorealistically without flagging; tragedy wants restraint over literalism; caricature has editorial-standards limits.' },
    { key: 'layout', ask: 'Where does it sit: full-bleed hero, square inset, wide banner, cover with title space?', why: 'Covers need reserved type zones; insets need simple silhouettes that survive text wrap.' },
    { key: 'series', ask: 'One-off or part of a recurring series/column with an established look?', why: 'Series consistency = locked style prefix + palette, same as icon families.' },
  ],

  routing: [
    { deliverable: 'article hero', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: 'strong conceptual-editorial register' },
        final: { model: 'nano-banana-pro', note: 'complex metaphors — it reasons the concept instead of illustrating keywords' },
        draft: { model: 'nano-banana-2-lite', note: 'metaphor thumbnails before committing' },
    }},
    { deliverable: 'spot illustration', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'simple, silhouette-strong, cheap per column' },
        series: { model: 'qwen3/text-to-image', note: 'seeded + locked prefix for recurring-column consistency' },
    }},
    { deliverable: 'book cover', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'when title/author type is part of the art' },
        art_only: { model: 'nano-banana-pro', note: 'art with reserved type zones; typography set in post' },
        layers: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose → art/type layers for the designer' },
    }},
    { deliverable: 'section header set', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'locked prefix per publication, one motif per section' },
    }},
    { deliverable: 'infographic base', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'labeled diagram bases; REAL data gets plotted in a chart tool, not generated' },
    }},
  ],

  promptFormulas: {
    'article hero': {
      structure: '[publication register] + [the visual metaphor arguing the angle] + [composition + where text/headline sits if overlaid] + [palette discipline] + [medium: flat illustration / photo-collage / painted]',
      example: 'Conceptual editorial illustration, clever-minimal register. A corporate office chair whose shadow is a marionette\'s crossbar with cut strings — for a story on middle managers losing control to algorithms. Flat illustration, muted navy and warm gray, one red accent on the strings. Right third open for the headline.',
      perModel: {
        'nano-banana-pro': 'Give it the thesis and let it propose the metaphor: "editorial illustration for an article arguing X".',
        'seedream/5-pro-text-to-image': 'Specify the metaphor yourself in one sentence; it executes rather than invents.',
      },
      pitfalls: [
        'Illustrate the ANGLE, not the topic — "AI story" gives robots; the thesis gives ideas.',
        'One metaphor. Compound metaphors die on the page.',
        'Reserve headline space when the layout overlays type.',
      ],
    },
    'book cover': {
      structure: '[genre register] + [central image/motif] + [title + author IN QUOTES if baked, or "reserve upper third for title"] + [palette + era of cover design] + [spine-safe composition note for print]',
      pitfalls: [
        'Baked type: verify letter-by-letter; misspelled author names have shipped.',
        'Keep critical elements off the left 10% (spine/gutter) for print.',
        'Genre conventions are real signals (serif-gold thriller, hand-lettered lit-fic) — name them.',
      ],
    },
    'infographic base': {
      structure: '"clean infographic layout base" + [structure: timeline/flow/comparison] + [label text in quotes] + [palette] + "placeholder zones for charts, no fake data"',
      pitfalls: ['NEVER let the model draw data (fake numbers ship as fact) — generate the frame, plot real data separately.', 'Few labels, quoted; dense labeling collapses.'],
    },
  },

  workflows: [
    { name: 'Article art on deadline', steps: [
      'Three metaphor thumbnails via nano-banana-2-lite (minutes, pennies)',
      'Editor picks; final at seedream/5-pro-text-to-image or nano-banana-pro',
      'grok_image_edit whole-image for the inevitable "can the accent be our red" note',
    ]},
    { name: 'Recurring column identity', steps: [
      'Design the look once: style prefix + palette + composition rule',
      'Per issue: qwen3/text-to-image with the locked prefix + that week\'s subject (seeded for stability)',
      'Keep a reference sheet of past columns; drift check each new one against it',
    ]},
    { name: 'Cover with separable type', steps: [
      'seedream/5-pro-text-to-image art with reserved type zone',
      'seedream_layer_decompose → art/background layers',
      'Typography set in the designer\'s tool over the layered art',
    ]},
  ],

  qualityChecklist: [
    'The image argues the article\'s angle, not just its topic',
    'Reads at placement size (300px spots, thumbnail covers)',
    'No fake data, fake headlines, or gibberish pull-quotes anywhere',
    'Real people: not photorealistically depicted unless editorially cleared',
    'Series pieces sit next to predecessors without visible drift',
    'Type zones clean; baked text proofed letter-by-letter',
  ],
}
