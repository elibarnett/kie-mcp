// Vertical profile: Editorial & Publishing (issue #91).
// Expert-reviewed 2026-08-27 (publication AD + web research): NB2 as hero
// default, disclosure-policy intake (AP/Nature norms), hard real-people rule,
// cliché ban, grok-generated finals for revision economics, reference-anchored
// series (seeds don't hold style).
export default {
  id: 'editorial',
  name: 'Editorial & Publishing',
  media: ['image'],
  summary: 'Article art, book covers, spot illustrations, infographic bases, and series-consistent publication imagery — tone-calibrated, disclosure-aware.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What piece? (article hero / spot illustration / book cover / section header set / infographic base / photo-illustration from staff photography)', why: 'A 1600px web hero and a print cover have opposite constraints; spots must read at 300px.' },
    { key: 'disclosure_policy', ask: 'Does the publication label AI-generated art? Any slots (news, photography) where AI is prohibited outright?', why: 'The biggest real-world gate: AP prohibits generative AI in news imagery and mandates labeling; scientific journals require figure-level disclosure; many outlets bar photoreal AI but allow illustration. Answer before generating.' },
    { key: 'subject_angle', ask: 'What is the piece ABOUT, and what is the article\'s angle? (a story about AI regulation ≠ a story about AI hype)', why: 'Editorial art is commentary — the metaphor must argue the thesis or it fights the text.' },
    { key: 'publication_voice', ask: 'Publication register: conceptual-clever, data-serious, warm-literary, tech-clean, tabloid-bold?', why: 'House style is identity; naming an adjacent publication register beats adjectives.' },
    { key: 'sensitivity', ask: 'Sensitive topic? (politics, health, tragedy, real identifiable people)', why: 'Real people: never photorealistic. Tragedy: abstraction over depiction. Caricature has editorial-standards limits and needs named-editor sign-off.' },
    { key: 'output_spec', ask: 'Web or print? Resolution/trim/bleed for print? Layout slot: full-bleed hero, square inset, wide banner, cover with title space?', why: '1K-only tiers are fine for thumbnails, unusable for print finals; covers need reserved type zones; insets need silhouettes that survive text wrap.' },
    { key: 'owned_photos', ask: 'Is there staff/owned photography to build on?', why: 'Photo-illustration from the pub\'s own photos is a core editorial mode — different routing (edit models), different disclosure line.' },
    { key: 'series', ask: 'One-off or part of a recurring series/column with an established look?', why: 'Series consistency = reference-anchored generation (past columns as refs). Seeds do NOT hold style across changed prompts.' },
  ],

  routing: [
    { deliverable: 'article hero', tiers: {
        default: { model: 'nano-banana-2', note: 'the workhorse: 4 cr, 4K, top-3 Arena, 14 refs for register-matching' },
        revision_ready: { model: 'grok-imagine-image-2-0/text-to-image', note: 'generate the FINAL here (4 cr) when revision rounds are expected (they always are): free segment map + 4 cr region edits beat 7-24 cr regens. The chain only works on grok-generated art.' },
        concept_heavy: { model: 'nano-banana-pro', note: 'genuinely complex metaphors; verify output — documented degradation windows' },
        design_register: { model: 'seedream/5-pro-text-to-image', note: 'design-brief-style alternative (days old, unproven)' },
        draft: { model: 'nano-banana-2-lite', note: 'metaphor thumbnails before committing' },
    }},
    { deliverable: 'spot illustration', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'simple, silhouette-strong, cheap per column' },
        series: { model: 'nano-banana-2', note: 'pass 2-3 past columns as references each time — the reliable consistency mechanism' },
        transparent: { model: 'recraft/remove-background', note: 'post step for text-wrap spots' },
    }},
    { deliverable: 'book cover', tiers: {
        default: { model: 'ideogram/v3-text-to-image', note: 'title/author type as part of the art' },
        art_only: { model: 'nano-banana-pro', note: 'art with reserved type zones; typography set in post; verify output' },
        layers: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose → art/type layers for the designer' },
        print_final: { model: 'recraft/crisp-upscale', note: 'post step — print needs 2K/4K equivalents' },
    }},
    { deliverable: 'section header set', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'locked prefix per publication; anchor additions on approved headers as refs' },
    }},
    { deliverable: 'infographic base', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'labeled diagram bases; REAL data gets plotted in a chart tool, never generated' },
    }},
    { deliverable: 'photo-illustration from staff photography', tiers: {
        default: { model: 'flux-kontext-pro', note: 'surgical instruction edits of the uploaded photo' },
        compose: { model: 'gpt-image/2-image-to-image', note: 'multi-photo composition' },
    }},
    { deliverable: 'multi-crop adaptation', tiers: {
        default: { model: 'ideogram/v3-reframe', note: 'hero → social/newsletter/banner via outpainting; every publication needs this weekly' },
    }},
  ],

  promptFormulas: {
    'article hero': {
      structure: '[publication register] + [the visual metaphor arguing the angle] + [composition + reserved headline zone if overlaid] + [palette discipline] + [medium: flat illustration / photo-collage / painted]',
      example: 'Conceptual editorial illustration, clever-minimal register. A corporate office chair whose shadow is a marionette\'s crossbar with cut strings — for a story on middle managers losing control to algorithms. Flat illustration, muted navy and warm gray, one red accent on the strings. Right third open for the headline.',
      perModel: {
        'nano-banana-pro': 'Give it the thesis and let it propose the metaphor; verify output.',
        'nano-banana-2': 'Specify the metaphor; attach register references (past heroes) for house style.',
        'grok-imagine-image-2-0/text-to-image': 'Same specification; you are buying the cheap revision loop.',
      },
      pitfalls: [
        'Illustrate the ANGLE, not the topic — "AI story" gives robots; the thesis gives ideas.',
        'CLICHÉ BAN: no robots-for-AI, chess boards, mazes, lightbulbs, handshakes. Generate 3 distinct metaphors and kill the first — it is the stock one.',
        'One metaphor. Compound metaphors die on the page.',
        'Reserve headline space when the layout overlays type.',
      ],
    },
    'book cover': {
      structure: '[genre register] + [central image/motif] + [title + author IN QUOTES if baked, or "reserve upper third for title"] + [palette + era of cover design] + [spine-safe composition for print]',
      pitfalls: [
        'Baked type verified letter-by-letter; misspelled author names have shipped.',
        'Critical elements off the left 10% (spine/gutter); print finals at 2K/4K or upscale via recraft/crisp-upscale.',
        'Genre conventions are real signals (serif-gold thriller, hand-lettered lit-fic) — name them.',
      ],
    },
    'infographic base': {
      structure: '"clean infographic layout base" + [structure: timeline/flow/comparison] + [label text in quotes] + [palette] + "placeholder zones for charts, no fake data"',
      pitfalls: ['NEVER let the model draw data — fake numbers ship as fact. Frame only; plot real data separately.', 'Few labels, quoted; dense labeling collapses.'],
    },
  },

  workflows: [
    { name: 'Article art on deadline', steps: [
      'Three metaphor thumbnails on nano-banana-2-lite (minutes, pennies) — kill the cliché one',
      'Editor picks; final on grok-imagine-image-2-0 (revision-ready) or nano-banana-2',
      'Revision notes: grok_segment_map (free) + grok_image_edit per region on grok finals; whole-image edit otherwise',
      'Attach the publication\'s AI-credit line per policy',
    ]},
    { name: 'Recurring column identity', steps: [
      'Design the look once: style, palette, composition rule; get 2-3 approved columns',
      'Per issue: nano-banana-2 with the approved columns attached as references + this week\'s subject',
      'Drift check each new one against the reference sheet before publishing',
    ]},
    { name: 'Photo-illustration from staff photography', steps: [
      'upload_file the staff photo',
      'flux-kontext-pro instruction edit (or gpt-image/2 for multi-photo composition)',
      'Label per policy ("photo illustration"); NEVER for news-photo slots',
    ]},
    { name: 'Cover with separable type', steps: [
      'seedream/5-pro-text-to-image art with reserved type zone',
      'seedream_layer_decompose → art/background layers',
      'Typography set in the designer\'s tool; recraft/crisp-upscale for print',
    ]},
    { name: 'Weekly multi-crop', steps: [
      'Approved hero → ideogram/v3-reframe per slot (social, newsletter, banner)',
      'Keep the metaphor\'s focal element inside the original region',
    ]},
  ],

  qualityChecklist: [
    'The image argues the article\'s angle, not just its topic — and is not the stock metaphor',
    'AI-generation credit/disclosure line matches publication policy; AI never used in prohibited slots (news photography)',
    'NEVER photorealistic real people. Stylized/caricature only, with named-editor sign-off',
    'Tragedy/violence: abstraction over depiction; never render victims',
    'No fake data, fake headlines, or gibberish pull-quotes anywhere',
    'Reads at placement size (300px spots, thumbnail covers)',
    'Series pieces sit next to predecessors without visible drift',
    'Type zones clean; baked text proofed letter-by-letter; print finals at print resolution',
    'Provenance note: NB-family outputs carry SynthID watermarks — relevant to disclosure claims',
  ],
}
