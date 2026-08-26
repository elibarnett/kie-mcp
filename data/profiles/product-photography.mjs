// Vertical profile: Product Photography & E-commerce (issue #91, Phase 2).
export default {
  id: 'product-photography',
  name: 'Product Photography & E-commerce',
  media: ['image'],
  summary: 'Packshots, lifestyle scenes, listing sets, and marketplace-compliant product imagery — built around the REAL product via reference photos.',
  lastReviewed: '2026-08-26',

  intake: [
    { key: 'deliverable', ask: 'What shot? (clean packshot / lifestyle scene / listing set (multi-angle) / scale-reference shot / detail-texture macro / comparison layout)', why: 'Marketplace listings need a specific shot ladder; a single lifestyle hero is a different job.' },
    { key: 'product_refs', ask: 'Real photos of the product? (upload_file → the pipeline keeps YOUR product; without refs the model invents a lookalike SKU)', why: 'Non-negotiable for commerce: the label, cap color, and proportions must be the actual product. Reference-driven i2i or nothing.' },
    { key: 'marketplace', ask: 'Where does it list? (Amazon: pure-white background 85% frame fill; Etsy/Shopify: freer; own site: brand rules)', why: 'Marketplaces enforce compliance rules — white background, no props, no text/badges — that override creative wishes.' },
    { key: 'surface_light', ask: 'Surface and lighting: white sweep softbox, warm wood daylight, dark slate dramatic, gradient studio?', why: 'The surface/light combo IS the product-photo genre; naming it beats mood adjectives.' },
    { key: 'props', ask: 'Props/context allowed? (ingredients around food, lifestyle hands-in-use, or strictly none)', why: 'Models set-dress enthusiastically; commerce shots usually need explicit restraint.' },
    { key: 'label', ask: 'Must the label be fully legible, angled, or is the back/side fine?', why: '"Label facing camera, fully legible" must be stated or the model rotates the hero face away.' },
    { key: 'variants', ask: 'Colorways/flavors to cover? Same scene per variant?', why: 'Variant sets route through segment→edit: one scene, swap the product region per SKU.' },
  ],

  routing: [
    { deliverable: 'clean packshot', tiers: {
        from_refs: { tool: 'grok_image_edit', note: 'whole-image mode on the uploaded photo: "pure white seamless background, soft studio shadow, product unchanged"' },
        surgical: { model: 'flux-kontext-pro', note: 'dust/reflection/backdrop cleanup on real photography' },
        no_refs: { model: 'nano-banana-pro', note: 'ONLY for generic/unbranded products — never for a real SKU' },
    }},
    { deliverable: 'lifestyle scene', tiers: {
        from_refs: { model: 'nano-banana-pro', note: 'multi-image: product refs via image_urls composed into the scene' },
        edit_scene: { tool: 'grok_image_edit', note: 'move the shot to a new setting, product preserved' },
        draft: { model: 'nano-banana-2-lite', note: 'scene concept exploration before spending on composition' },
    }},
    { deliverable: 'listing set (multi-angle)', tiers: {
        default: { model: 'nano-banana-pro', note: 'per-angle prompts with the same refs: front, 3/4, back, in-hand scale, detail' },
    }},
    { deliverable: 'detail-texture macro', tiers: {
        default: { model: 'flux-kontext-pro', note: 'crop-and-enhance from the real photo beats generating fake texture' },
        upscale: { model: 'recraft/crisp-upscale', note: 'for zoom views from existing shots' },
    }},
    { deliverable: 'comparison layout', tiers: {
        default: { model: 'gpt-image/2-text-to-image', note: 'labeled side-by-side layouts need the text tier' },
    }},
  ],

  promptFormulas: {
    'clean packshot': {
      structure: '[the real product via refs] + "pure white seamless background (#FFFFFF), soft contact shadow" + [angle: straight-on/3-4] + "label facing camera, fully legible" + "no props, no reflections beyond a subtle floor catch" + [marketplace fill: product ~85% of frame]',
      perModel: {
        'flux-kontext-pro': 'Instruction register: state ONLY what changes ("replace background with pure white, keep everything else identical").',
        'nano-banana-pro': 'Describe scene around the referenced product; restate "the exact product from the reference images, unaltered".',
      },
      pitfalls: [
        'Say "unaltered/unchanged product" every time — compositors love to redesign labels.',
        'Amazon-bound: pure white (#FFFFFF), no props, no badges/text, high frame fill.',
        'Verify the label text against the real product photo character-by-character — regenerations corrupt small type.',
      ],
    },
    'lifestyle scene': {
      structure: '[product refs] + [scene: place, time, who is implied] + [product placement + camera angle] + [light matching the scene] + [supporting props bounded] + [depth of field note]',
      pitfalls: [
        'Match scene light to the ref photo\'s light direction or the composite looks pasted.',
        'Hands holding products are still a weak point — prefer "beside", "on", "in front of" placements, and inspect fingers when hands are required.',
        'Shallow depth of field ("background softly out of focus") hides scene-generation artifacts.',
      ],
    },
  },

  workflows: [
    { name: 'SKU listing ladder', steps: [
      'upload_file the best real photos (front + 3/4 minimum) — file_path mode',
      'Packshot: grok_image_edit whole-image → pure white compliant hero',
      'Lifestyle: nano-banana-pro multi-image into 2-3 scenes',
      'Detail: flux-kontext-pro crop/cleanup + recraft/crisp-upscale',
      'Verify every frame against the physical product (label, cap, proportions)',
    ]},
    { name: 'Colorway variants', steps: [
      'Build the hero scene once with the base SKU',
      'grok_segment_map the hero (free) → product region identified',
      'grok_image_edit per colorway: recolor ONLY the product region, scene identical',
      'Comparison layout via gpt-image/2 if the listing shows the range',
    ]},
  ],

  qualityChecklist: [
    'The product is THE product: label text, logo placement, cap/lid color, proportions vs the reference',
    'Marketplace compliance: background purity, frame fill, no forbidden props/badges',
    'Shadow direction consistent between product and scene',
    'No invented variants (flavors/colors that do not exist)',
    'Hands (if any) have five fingers doing plausible things',
    'Reflective products: reflections show a plausible studio, not alien geometry',
  ],
}
