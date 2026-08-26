// Vertical profile: Video Game Assets (issue #91).
export default {
  id: 'game-assets',
  name: 'Video Game Assets',
  media: ['image'],
  summary: 'Character sheets, environment concepts, sprites, tileable textures, icons, and key art — engine-aware, style-bible-consistent.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'asset_type', ask: 'What asset? (character concept/sheet / environment concept / prop sheet / sprite or pixel art / tileable texture / UI icon set / key art / skybox)', why: 'Each type has a different model, view convention, and post-processing chain.' },
    { key: 'style_bible', ask: 'Style reference: existing game art to match, or a named style (painterly, cel-shaded, pixel, low-poly render, PBR-realistic)?', why: 'Consistency with existing assets is the whole game; a reference image via upload_file beats any style adjective.' },
    { key: 'engine_target', ask: 'Engine and target resolution/size? (e.g. Unity sprite 512px, Godot tile 64px, marketing key art 4K)', why: 'Pixel art must be generated large then downscaled to grid; textures need power-of-two sizes; key art needs upscale headroom.' },
    { key: 'view', ask: 'View convention: side-scroller profile, top-down, 3/4 isometric (2:1 dimetric?), or free camera?', why: 'Iso/top-down angles must match existing assets exactly or the asset is unusable; models drift off-angle unless pinned.' },
    { key: 'palette', ask: 'Palette constraints? (named palette, hex list, "match this screenshot", or free)', why: 'Games read through palette cohesion; unconstrained assets look pasted-in.' },
    { key: 'transparency', ask: 'Does it need a transparent background?', why: 'Generate on a flat solid background, then recraft/remove-background — never ask the model for "transparent background" (it draws checkerboards).' },
    { key: 'consistency', ask: 'One-off, or a set that must stay consistent (same character in poses, icon family, tile variants)?', why: 'Sets route to ideogram/character or seeded qwen3 runs; one-offs have more model freedom.' },
    { key: 'ip_safety', ask: 'Any IP constraints — must NOT resemble existing franchises?', why: 'Style prompts naming games ("Zelda-like") pull trade-dress lookalikes; safer to describe the aesthetic in neutral terms.' },
  ],

  routing: [
    { deliverable: 'character concept/sheet', tiers: {
        draft: { model: 'seedream/5-lite-text-to-image', note: 'fast stylized exploration' },
        consistent_set: { model: 'ideogram/character', note: 'lock a character from one reference, then generate poses/expressions' },
        final: { model: 'seedream/4.5-text-to-image', note: 'the proven game-art tier; "character turnaround sheet, front/side/back" in one image' },
    }},
    { deliverable: 'environment concept', tiers: {
        draft: { model: 'nano-banana-2-lite', note: '' },
        value: { model: 'seedream/5-lite-text-to-image', note: 'painterly environments' },
        final: { model: 'nano-banana-pro', note: 'complex multi-object scenes with lore-consistent detail' },
    }},
    { deliverable: 'sprite or pixel art', tiers: {
        default: { model: 'qwen3/text-to-image', note: 'prompt_extend OFF; "true pixel art, NxN grid, hard edges, no anti-aliasing" — then downscale to grid in post' },
        alt: { model: 'qwen/text-to-image', note: 'cheapest fallback, same technique' },
    }},
    { deliverable: 'tileable texture', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: '"seamless tileable texture, orthographic top-down, even lighting, no vignette" — verify by offsetting 50% in post' },
        draft: { model: 'nano-banana-2-lite', note: '' },
    }},
    { deliverable: 'UI icon set', tiers: {
        default: { model: 'recraft/crisp-upscale', note: 'generate base icons with seedream/5-lite (same prompt prefix + palette per icon), upscale crisp; remove-background for transparency' },
        base: { model: 'seedream/5-lite-text-to-image', note: 'one icon per call, identical style prefix — batch consistency trick' },
    }},
    { deliverable: 'key art', tiers: {
        value: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose after → logo space/character/background layers for marketing' },
        final: { model: 'nano-banana-pro', note: 'hero-quality composition' },
        iterate: { tool: 'grok_image_edit', note: 'region-edit approved art instead of regenerating (segment first, free)' },
    }},
    { deliverable: 'skybox', tiers: {
        default: { model: 'seedream/5-pro-text-to-image', note: '"equirectangular 360 panorama, horizon centered" at 2:1 aspect; check pole distortion' },
    }},
  ],

  promptFormulas: {
    'character concept/sheet': {
      structure: '[style bible ref] + [species/build/silhouette] + [costume + materials + palette] + [pose/turnaround spec] + [flat neutral background] + [view convention]',
      example: 'Painterly hand-drawn RPG style. Stocky dwarven engineer, distinctive silhouette: oversized wrench backpack. Leather apron (burnt umber), brass goggles, teal accents. Character turnaround sheet: front, 3/4, side, back views, consistent proportions. Flat light-gray background.',
      perModel: {
        'ideogram/character': 'One clean face-visible reference in, then short per-pose prompts — do not restate the design each call.',
        'seedream/4.5-text-to-image': 'State "turnaround sheet" explicitly; it lays out views in one canvas.',
      },
      pitfalls: [
        'Silhouette first — if it does not read in silhouette it fails in game.',
        'Flat background, never scenery, for anything you will cut out.',
        'Name the palette per part ("apron burnt umber") or sets drift.',
      ],
    },
    'sprite or pixel art': {
      structure: '"true pixel art, [N]x[N] pixel grid, hard edges, no anti-aliasing, limited [K]-color palette" + [subject] + [view convention] + [flat background color]',
      pitfalls: [
        'Models output "pixel-style" at high res — always downscale to the true grid in post (nearest-neighbor).',
        'prompt_extend OFF on qwen3 — expansion destroys pixel constraints.',
        'Ask for a flat magenta/green background for clean keying, then remove-background.',
      ],
    },
    'tileable texture': {
      structure: '"seamless tileable [material] texture, orthographic top-down, uniform diffuse lighting, no shadows, no vignette, no border" + [material detail + scale hint]',
      pitfalls: ['"Seamless" is a request, not a guarantee — test with a 50% offset; regenerate on visible seams.', 'Uniform lighting matters more than material detail; baked shadows break tiling.'],
    },
    'key art': {
      structure: '[composition: focal character + action] + [style bible] + [lighting drama] + [negative space for logo/title] + [aspect for storefront]',
      pitfalls: ['Reserve logo space explicitly ("upper third open sky for title") — art without negative space is unusable for capsules.', 'Do NOT ask the model to render the game logo; composite it in post.'],
    },
  },

  workflows: [
    { name: 'Consistent character pipeline', steps: [
      'Concept: 4 drafts on seedream/5-lite-text-to-image',
      'Pick + refine the design at final tier',
      'ideogram/character with the approved design as reference → pose/expression set',
      'recraft/remove-background each pose for engine import',
    ]},
    { name: 'Icon family', steps: [
      'Write one style prefix (style, palette, lighting, framing) reused verbatim per icon',
      'seedream/5-lite-text-to-image per icon, prefix + subject only',
      'recraft/remove-background then recraft/crisp-upscale to target size',
    ]},
    { name: 'Key art with editable layers', steps: [
      'seedream/5-pro-text-to-image hero composition',
      'seedream_layer_decompose → character/background/effects layers',
      'Iterate single layers or grok_segment_map + grok_image_edit for regional fixes',
    ]},
  ],

  qualityChecklist: [
    'Style matches the bible side-by-side, not from memory',
    'View angle matches existing assets exactly (overlay-check isometric angles)',
    'Silhouette reads at gameplay scale (zoom out to 10%)',
    'Palette within constraints; no rogue hues',
    'Pixel art on-grid after downscale; no half-pixels',
    'Textures tile without visible seams at 50% offset',
    'Transparent-bg assets have clean edges (no halo) after removal',
  ],
}
