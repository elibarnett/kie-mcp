// Vertical profile: Video Game Assets (issue #91).
// Expert-reviewed 2026-08-27 (senior game AD + web research): NB2 multi-ref as
// the consistency engine, gpt-image-2 pixel tier, disclosure gate, style-bible
// workflow, skybox aspect fix, palette quantization.
export default {
  id: 'game-assets',
  name: 'Video Game Assets',
  media: ['image'],
  summary: 'Character sheets, environment concepts, sprites, tileable textures, icons, and key art — engine-aware, style-bible-consistent.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'asset_type', ask: 'What asset? (character concept/sheet / environment concept / prop sheet / sprite or pixel art / tileable texture / UI icon set / key art / skybox)', why: 'Each type has a different model, view convention, and post-processing chain. Sprites/icons/cut-outs always get the flat-background-then-remove-background treatment — no need to ask.' },
    { key: 'usage_gate', ask: 'Concept reference for human artists, or shipped in-game? Any publisher/platform AI rules?', why: 'Steam requires AI-content disclosure; many publishers allow AI concepting but ban shipped AI assets. Changes the quality bar, the model log you must keep, and sometimes whether to do the job.' },
    { key: 'animation_intent', ask: 'Static, pose set, or animation frames?', why: 'Frame-to-frame coherence is still unreliable — pose sets are deliverable, walk cycles mostly are not. Set the expectation before generating, not after.' },
    { key: 'style_bible', ask: 'Style reference: existing game art to match (upload it!), or a named style (painterly, cel-shaded, pixel, low-poly render, PBR-realistic)?', why: 'Consistency with existing assets is the whole game; a reference image via upload_file beats any style adjective.' },
    { key: 'engine_target', ask: 'Engine and target resolution/size? (Unity sprite 512px, Godot tile 64px, key art 4K). For icons: display size (24/32/48px) and family count?', why: 'Pixel art must be generated large then downscaled to grid; textures need power-of-two sizes; icon readability at display size is the acceptance test, and count decides whether prefix-batching is viable.' },
    { key: 'view', ask: 'View convention: side-scroller profile, top-down, 3/4 isometric (2:1 dimetric?), or free camera?', why: 'Iso/top-down angles must match existing assets exactly or the asset is unusable; models drift off-angle unless pinned.' },
    { key: 'palette', ask: 'Palette constraints? (named palette, hex list, "match this screenshot", or free)', why: 'Games read through palette cohesion; unconstrained assets look pasted-in.' },
    { key: 'consistency', ask: 'One-off, or a set that must stay consistent (same character in poses, icon family, tile variants)?', why: 'Sets route through reference-anchored generation (NB2 multi-ref); one-offs have more model freedom.' },
    { key: 'ip_safety', ask: 'Any IP constraints — must NOT resemble existing franchises?', why: 'Style prompts naming games ("Zelda-like") pull trade-dress lookalikes; describe the aesthetic in neutral terms.' },
  ],

  routing: [
    { deliverable: 'character concept/sheet', tiers: {
        draft: { model: 'seedream/5-lite-text-to-image', note: 'fast stylized exploration' },
        consistent_set: { model: 'nano-banana-2', note: 'THE set engine: up to 14 reference images, multi-character consistency. Feed the approved design + style bible per pose.' },
        consistent_alt: { model: 'gpt-image/2-image-to-image', note: '"same character, new scene" across up to 16 refs — premium consistency tier' },
        face_forward: { model: 'ideogram/character', note: 'face-consistency only — clothing/accessories/proportions drift; mascots and portraits, NOT full-body game characters' },
        final: { model: 'seedream/4.5-text-to-image', note: 'proven game-art tier; "character turnaround sheet, front/side/back" in one canvas' },
    }},
    { deliverable: 'environment concept', tiers: {
        draft: { model: 'nano-banana-2', note: '' },
        value: { model: 'seedream/5-lite-text-to-image', note: 'painterly environments' },
        final: { model: 'flux-2/pro-text-to-image', note: 'tops 2026 benchmarks for atmospheric depth/scale, cheaper than NB-Pro' },
        final_alt: { model: 'nano-banana-pro', note: 'lore-consistent multi-object scenes — verify output (documented degradation windows)' },
    }},
    { deliverable: 'prop sheet', tiers: {
        default: { model: 'seedream/4.5-text-to-image', note: '"prop sheet, 6 variations, flat background" with the style-bible reference' },
    }},
    { deliverable: 'sprite or pixel art', tiers: {
        default: { model: 'qwen3/text-to-image', note: 'budget default; prompt_extend OFF, pin seed for variants' },
        quality: { model: 'gpt-image/2-text-to-image', note: '2026 consensus best for crisp pixel edges and strict palettes — hero sprites, 8 cr' },
    }},
    { deliverable: 'tileable texture', tiers: {
        default: { model: 'seedream/4.5-text-to-image', note: 'proven tier. "seamless tileable texture, orthographic top-down, even lighting, no vignette" — verify with 50% offset' },
        experimental: { model: 'seedream/5-pro-text-to-image', note: 'unbenchmarked (days old) — try, don\'t rely' },
    }},
    { deliverable: 'UI icon set', tiers: {
        default: { model: 'seedream/5-lite-text-to-image', note: 'one icon per call with a LOCKED style prefix; then recraft/remove-background → recraft/crisp-upscale as post steps' },
        reference_anchored: { model: 'nano-banana-2', note: 'family additions: pass 2-3 approved icons as references instead of trusting the prefix alone' },
    }},
    { deliverable: 'key art', tiers: {
        value: { model: 'seedream/5-pro-text-to-image', note: 'layer-decompose after → logo space/character/background layers' },
        final: { model: 'nano-banana-pro', note: 'hero composition; verify (degradation windows)' },
        iterate: { tool: 'grok_image_edit', note: 'IMPORTANT: the free segment→edit chain only works on grok-2.0-GENERATED art. Plan iteration → generate the base on grok-imagine-image-2-0/text-to-image (4 cr). Foreign/uploaded art gets whole-image edits or flux-kontext-pro surgical fixes only.' },
    }},
    { deliverable: 'skybox', tiers: {
        default: { model: 'seedream/4.5-text-to-image', note: '21:9 (its widest real ratio — 2:1 does not exist here); "equirectangular 360 panorama, horizon centered". Wrap-seam check: shift 50% horizontally, the vertical seam must be invisible; inpaint seams via qwen/image-edit.' },
        alt: { model: 'nano-banana-2', note: '21:9 alternative' },
    }},
  ],

  promptFormulas: {
    'character concept/sheet': {
      structure: '[style bible ref AS IMAGE] + [species/build/silhouette] + [costume + materials + palette] + [pose/turnaround spec] + [flat neutral background] + [view convention]',
      example: 'Painterly hand-drawn RPG style (match the attached style reference). Stocky dwarven engineer, distinctive silhouette: oversized wrench backpack. Leather apron (burnt umber), brass goggles, teal accents. Character turnaround sheet: front, 3/4, side, back views, consistent proportions. Flat light-gray background.',
      perModel: {
        'nano-banana-2': 'Attach the approved design + style bible as references; per-pose prompts carry ONLY the pose/action.',
        'ideogram/character': 'One clean face-visible reference; face holds, wardrobe drifts — re-specify costume every call.',
        'seedream/4.5-text-to-image': 'State "turnaround sheet" explicitly; it lays out views in one canvas.',
      },
      pitfalls: [
        'Silhouette first — if it does not read in silhouette it fails in game.',
        'Flat background, never scenery, for anything you will cut out (then recraft/remove-background).',
        'Name the palette per part ("apron burnt umber") or sets drift.',
      ],
    },
    'sprite or pixel art': {
      structure: '"true pixel art, [N]x[N] pixel grid, hard edges, no anti-aliasing, limited [K]-color palette" + [subject] + [view convention] + [flat background color]',
      pitfalls: [
        'Models output "pixel-style" at high res — downscale to the true grid (nearest-neighbor) AND quantize to the palette after: downscaling alone leaves off-palette blend pixels and fringe.',
        'prompt_extend OFF on qwen3 — expansion destroys pixel constraints.',
        'Flat magenta/green background for clean keying, then remove-background.',
      ],
    },
    'tileable texture': {
      structure: '"seamless tileable [material] texture, orthographic top-down, uniform diffuse lighting, no shadows, no vignette, no border" + [material detail + scale hint]',
      pitfalls: [
        '"Seamless" is a request, not a guarantee — test with a 50% offset; regenerate or inpaint visible seams.',
        'Uniform lighting matters more than detail; baked shadows break tiling.',
        'This is ALBEDO only — normal/roughness/AO maps get derived in Substance/Materialize, not generated.',
      ],
    },
    'key art': {
      structure: '[composition: focal character + action] + [style bible] + [lighting drama] + [negative space for logo/title] + [aspect for storefront]',
      pitfalls: ['Reserve logo space explicitly — art without negative space is unusable for capsules.', 'Do NOT ask the model to render the game logo; composite it in post.'],
    },
  },

  workflows: [
    { name: 'Style-bible match (the core 2026 workflow)', steps: [
      'upload_file 2-4 existing game-art pieces as the style anchor',
      'nano-banana-2 with those references attached + the new asset\'s prompt',
      'Every subsequent asset carries the same reference set — references beat prefixes',
    ]},
    { name: 'Consistent character pipeline', steps: [
      'Concept: 4 drafts on seedream/5-lite-text-to-image',
      'Pick + refine the design at final tier',
      'Pose/expression set on nano-banana-2: approved design + style bible as references, per-pose prompts',
      'recraft/remove-background each pose for engine import',
      'Log model + prompt per asset (disclosure requirements)',
    ]},
    { name: 'Icon family', steps: [
      'Lock the style prefix (style, palette hex, lighting, framing); one icon per call on seedream/5-lite-text-to-image',
      'Family additions later: nano-banana-2 with 2-3 approved icons as references',
      'recraft/remove-background then recraft/crisp-upscale; reject icons that muddy at 24px',
    ]},
    { name: 'Key art with editable layers', steps: [
      'Generate the base on grok-imagine-image-2-0 if regional iteration is planned (segment map only works on grok-generated art)',
      'Or: seedream/5-pro-text-to-image hero → seedream_layer_decompose → character/background/effects layers',
      'topaz/image-upscale to 4K storefront/capsule sizes',
    ]},
    { name: 'Texture/skybox seam repair', steps: [
      'Offset the image 50% horizontally',
      'Inpaint the visible seam via qwen/image-edit or flux-kontext-pro',
      'Re-verify the offset tile before shipping',
    ]},
  ],

  qualityChecklist: [
    'Style matches the bible side-by-side, not from memory',
    'AI-artifact pass: hands, garbled pseudo-text, melted detail — the #1 tell',
    'View angle matches existing assets exactly (overlay-check isometric angles)',
    'Silhouette reads at gameplay scale (zoom to 10%); grayscale/value read holds',
    'Relative scale sane against a known reference asset',
    'Palette within constraints after quantization; no rogue hues or fringe pixels',
    'Pixel art on-grid after downscale; textures tile at 50% offset; skybox wrap-seam invisible',
    'Transparent-bg assets have clean edges (no halo) after removal',
    'Model + prompt logged per asset (Steam/publisher disclosure)',
  ],
}
