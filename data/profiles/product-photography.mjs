// Vertical profile: Product Photography & E-commerce (issue #91).
// Expert-reviewed 2026-08-27 (studio lead + web research): cutout-first packshot
// pipeline (never regenerate the product), material/dimensions intake, pixel-
// verifiable Amazon compliance, gpt-image-2 compositing tier.
export default {
  id: 'product-photography',
  name: 'Product Photography & E-commerce',
  media: ['image', 'video'],
  summary: 'Packshots, lifestyle scenes, listing sets, and marketplace-compliant product imagery — built around the REAL product via reference photos.',
  lastReviewed: '2026-08-27',

  intake: [
    { key: 'deliverable', ask: 'What shot? (clean packshot / lifestyle scene / listing set (multi-angle) / scale-reference shot / detail-texture macro / comparison or infographic frame)', why: 'Marketplace listings need a specific shot ladder; note Amazon SECONDARY images allow text/infographics — only the main image is prop-free.' },
    { key: 'product_refs', ask: 'Real photos of the product — including a FRONT-ON, evenly lit label shot? (upload_file; that label photo is the clearest text reference the model gets)', why: 'Non-negotiable: label, cap color, and proportions must be the actual product. Without refs the model invents a lookalike SKU.' },
    { key: 'material', ask: 'Material/finish: glass or transparent? metallic? glossy? matte?', why: 'The #1 AI failure surface. Reflections invent geometry; refraction shows the wrong background after a swap. Transparent + reflective products get extra QC and usually the cutout route, not regeneration.' },
    { key: 'dimensions', ask: 'Exact product dimensions, or a familiar-object size anchor?', why: 'Proportion drift is undetectable without ground truth — and the scale-reference shot needs it explicitly.' },
    { key: 'marketplace_spec', ask: 'Where does it list, and what output spec? (Amazon main: EXACTLY RGB 255,255,255 background, ~85% frame fill, shadows must not touch frame edges, ≥1600-2000px longest side for zoom; social: 4:5/9:16)', why: 'Amazon\'s automated scanner rejects near-white and edge-touching shadows and suppresses listings. Resolution drives the upscale step.' },
    { key: 'surface_light', ask: 'Surface and lighting: white sweep softbox, warm wood daylight, dark slate dramatic, gradient studio?', why: 'The surface/light combo IS the product-photo genre.' },
    { key: 'props_label', ask: 'Props/context allowed? Must the label be fully legible face-on?', why: 'Models set-dress enthusiastically; "label facing camera, fully legible" must be stated or the hero face rotates away.' },
    { key: 'variants', ask: 'Colorways/flavors to cover? Same scene per variant?', why: 'Variant sets route through one hero scene + per-SKU product swaps.' },
  ],

  routing: [
    { deliverable: 'clean packshot', tiers: {
        default: { model: 'recraft/remove-background', note: 'CUTOUT-FIRST is the real pipeline: remove background → composite on pure #FFFFFF → soft contact shadow via one light edit. The product pixels are never regenerated = zero label corruption.' },
        shadow_pass: { model: 'flux-kontext-pro', note: '"add a soft contact shadow under the product, keep the product pixels identical" on the composite; also dust/reflection cleanup on source photos' },
        regenerate_fallback: { tool: 'grok_image_edit', note: 'whole-image re-render ONLY when the source photo is unusable — maximum label-corruption risk, QC hard' },
        upscale: { model: 'recraft/crisp-upscale', note: 'to the 2000px zoom target' },
    }},
    { deliverable: 'lifestyle scene', tiers: {
        premium: { model: 'gpt-image/2-image-to-image', note: '#1 Arena editor; reasons across up to 16 refs — product cutout + scene refs + brand kit composited with correct lighting' },
        default: { model: 'nano-banana-pro', note: 'multi-image composition; cap iterative edits at 2-3 rounds (quality degrades after), verify output' },
        draft: { model: 'nano-banana-2', note: 'scene concept exploration, 4 cr' },
        edit_scene: { tool: 'grok_image_edit', note: 'whole-image: move the shot to a new setting' },
    }},
    { deliverable: 'listing set (multi-angle)', tiers: {
        default: { model: 'gpt-image/2-image-to-image', note: 'per-angle prompts with the same refs; check cross-set consistency after — drift between angles is the failure at volume' },
    }},
    { deliverable: 'detail-texture macro', tiers: {
        default: { model: 'flux-kontext-pro', note: 'crop-and-enhance from the real photo beats generating fake texture' },
        upscale: { model: 'recraft/crisp-upscale', note: 'zoom views from existing shots' },
    }},
    { deliverable: 'comparison or infographic frame', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'labeled layouts (Amazon secondary slots); product via refs, claims text verified' },
    }},
    { deliverable: 'channel adaptation', tiers: {
        default: { model: 'ideogram/v3-reframe', note: 'approved hero → per-ratio outpainting; keep the product inside the original region' },
    }},
    { deliverable: 'product video', tiers: {
        default: { model: 'pixverse-v6/image-to-video', note: 'orbit/hero motion from the APPROVED packshot — "slow 360 orbit, product static, label stays facing camera as long as possible"' },
        draft: { model: 'wan/flash-image-to-video', note: 'cheap motion tests' },
        hero: { model: 'veo-3/image-to-video', note: 'ad-grade material physics (fabric, liquid pours, steam) with native audio' },
        lifestyle_clip: { model: 'kling/image-to-video', note: 'animate the approved lifestyle scene — hands and pours get the same QC as stills' },
    }},
  ],

  promptFormulas: {
    'clean packshot': {
      structure: 'CUTOUT PIPELINE (no prompt for the product itself): remove-background → composite on #FFFFFF → shadow edit: "add a soft natural contact shadow directly under the product; keep the product pixels identical; shadow must not touch frame edges"',
      perModel: {
        'flux-kontext-pro': 'Instruction register, only the shadow/backdrop change stated.',
        'gpt-image/2-image-to-image': 'When compositing INTO scenes: label refs ("image 1 = the product, unaltered").',
      },
      pitfalls: [
        'Pixel-verify the background: sample corner pixels — must be exactly 255,255,255 (eyeballing near-white fails Amazon\'s scanner).',
        'Never publish generated regulatory text — barcodes, nutrition panels, warnings get composited from real artwork or kept out of frame.',
        '"Unaltered/unchanged product" in every compositing prompt — models love to redesign labels.',
        'Glass/transparent: background swaps break refraction — prefer the cutout route or budget heavy QC.',
      ],
    },
    'lifestyle scene': {
      structure: '[product cutout + refs] + [scene: place, time, who is implied] + [product placement + camera angle] + [light matching the product ref\'s direction] + [props bounded] + [depth of field note]',
      pitfalls: [
        'Match scene light direction to the ref photo or the composite looks pasted.',
        'Hands remain a weak point — prefer "beside/on/in front of" placements; inspect fingers when hands are required.',
        'Shallow depth of field hides scene-generation artifacts.',
        'Cap iteration at 2-3 rounds per image; re-composite from the cutout rather than editing an edit.',
      ],
    },
  },

  workflows: [
    { name: 'Amazon main-image compliance pass', steps: [
      'upload_file the best packshot (front-on label shot mandatory)',
      'recraft/remove-background → composite on pure white',
      'flux-kontext-pro shadow pass (soft contact shadow, not touching edges)',
      'Pixel-sample corners (must be 255,255,255); recraft/crisp-upscale to 2000px',
      'Zoom 100-200% on label + edges for the QC pass',
    ]},
    { name: 'SKU listing ladder', steps: [
      'Main: the compliance pass above',
      'Lifestyle: gpt-image/2-image-to-image with cutout + scene refs, 2-3 scenes',
      'Detail: flux-kontext-pro crop/cleanup + recraft/crisp-upscale',
      'Secondary infographic frames: gpt-image/2-text-to-image with verified claims text',
      'Cross-set check: proportions and label identical in every frame',
    ]},
    { name: 'Colorway variants', steps: [
      'Build the hero scene once with the base SKU (generate on grok-imagine-image-2-0 if using the region-swap chain — segment map is grok-task-only)',
      'grok_segment_map (free) → product region; grok_image_edit per colorway (4 cr), scene identical',
      'Fallback for foreign masters: flux-kontext-pro "change only the bottle to red, everything else identical"',
      'Never invent colorways that do not exist as SKUs',
    ]},
  ],

  qualityChecklist: [
    'Zoom 100-200% on label, edges, seams — character-by-character label check against the reference photo',
    'The product is THE product: proportions vs stated dimensions, cap/lid color, logo placement',
    'Background purity pixel-sampled (255,255,255); shadow not touching frame edges; ≥1600-2000px longest side',
    'No generated regulatory text anywhere (barcodes, nutrition, warnings)',
    'Cross-set consistency across all frames of a listing',
    'Shadow/light direction consistent between product and scene',
    'Reflective/transparent products: reflections show a plausible studio, refraction matches the background',
    'Hands (if any) have five fingers doing plausible things',
    'No invented variants (flavors/colors that do not exist)',
  ],
}
