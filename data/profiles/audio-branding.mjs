// Vertical profile: Audio Branding & Music (issue #99).
// First audio vertical. Routing here is tool-based (the audio catalog is
// exposed as dedicated tools, not market-model slugs): Suno for music,
// Gemini/ElevenLabs for speech, Suno V5 for SFX. Doctrine: exact-text
// discipline for lyrics and scripts, loudness targets per destination,
// and a hard consent gate on voice cloning.
export default {
  id: 'audio-branding',
  name: 'Audio Branding & Music',
  media: ['audio'],
  summary: 'Brand music, jingles, podcast intros, voiceover/narration, multi-speaker dialogue, SFX, and sonic logos — with stems, extensions, and loudness discipline.',
  lastReviewed: '2026-08-31',

  intake: [
    { key: 'deliverable', ask: 'What piece? (jingle or brand track / podcast intro-outro / voiceover-narration / multi-speaker dialogue / SFX set / sonic logo / long-form background music / music video visualization)', why: 'A 5s sonic logo and an 8-minute ambient bed are opposite jobs; speech and music route to different engines entirely.' },
    { key: 'destination', ask: 'Where does it play? (podcast / streaming / social clip / app UI / broadcast ad / in-game)', why: 'Destination sets the loudness target (~-14 LUFS streaming/social, ~-16 LUFS podcasts, broadcast has legal specs) and the format (WAV for production handoff, not MP3).' },
    { key: 'duration_structure', ask: 'Exact length and structure? (e.g. "15s: 3s logo sting, 10s bed, 2s button ending")', why: 'Generated music runs long and fades; ads and intros need hard outs. Suno takes structure hints but the edit does the precision.' },
    { key: 'mood_refs', ask: 'Genre, mood, tempo (BPM if known), and 1-2 reference tracks described in words?', why: 'Style words are the entire steering surface. Describe references ("driving 120bpm synthwave, warm analog bass") — never name a real artist or song as the thing to copy.' },
    { key: 'vocal_text', ask: 'Vocals or instrumental? If vocals or voiceover: the EXACT text/lyrics/script, verbatim?', why: 'Same discipline as in-image text: sung and spoken words are generated from your text — every word will be in the output, so proof it first. Suno lyrics prompts cap at 200 chars via generate_lyrics.' },
    { key: 'voice_character', ask: 'For speech: voice character (age/register/energy), language(s), and pacing? Multiple speakers?', why: 'Gemini TTS is style-directed with 30 named voices, per-speaker style, and tone tags ([whispers], [laughs]); ElevenLabs V3 dialogue handles multi-speaker scenes. The description IS the casting.' },
    { key: 'clone_consent', ask: 'If cloning a real person\'s voice: do you have their documented consent?', why: 'HARD GATE. No consent, no clone — regardless of who asks. A described synthetic voice is always available instead.' },
    { key: 'series_reuse', ask: 'One-off, or a sonic identity reused across content (same intro every episode, same UI sound family)?', why: 'Identity = generate once, reuse the file everywhere; extend_music continues the SAME track for length variants instead of regenerating a lookalike.' },
  ],

  routing: [
    { deliverable: 'jingle or brand track', tiers: {
        default: { tool: 'generate_music', note: 'Suno V5 (best quality) or V5.5 (custom style); up to 8 min; structure hints in the prompt' },
        lyrics_first: { tool: 'generate_lyrics', note: 'draft/refine the sung text before committing credits to audio' },
        length_variants: { tool: 'extend_music', note: 'continue the approved track from a timestamp — 15s/30s/60s cuts of ONE identity, not three lookalikes' },
    }},
    { deliverable: 'podcast intro-outro', tiers: {
        default: { tool: 'generate_music', note: 'instrumental bed with a defined ending ("clean button ending, no fade")' },
        with_vo: { tool: 'generate_gemini_tts', note: 'style-directed show-open line over the bed; mix in the edit' },
    }},
    { deliverable: 'voiceover-narration', tiers: {
        default: { tool: 'generate_gemini_tts', note: 'most expressive; flash for clips <60s, pro for longer narration; tone tags inline' },
        alt: { tool: 'generate_tts', note: 'ElevenLabs Turbo 2.5 (fast) / Multilingual V2 (quality) — the workhorse for long multilingual reads' },
    }},
    { deliverable: 'multi-speaker dialogue', tiers: {
        default: { tool: 'generate_dialogue', note: 'ElevenLabs Text-to-Dialogue V3 — distinct voices per character' },
        two_speaker: { tool: 'generate_gemini_tts', note: 'up to 2 speakers with per-speaker accent/style/pace' },
    }},
    { deliverable: 'SFX set', tiers: {
        default: { tool: 'generate_sfx', note: 'Suno V5 text-to-SFX: UI clicks, stings, whooshes, ambiences' },
    }},
    { deliverable: 'sonic logo', tiers: {
        default: { tool: 'generate_sfx', note: '1-3s branded sting — describe instrumentation + arc ("three ascending marimba notes, warm tail")' },
        musical: { tool: 'generate_music', note: 'when the logo is a musical phrase; trim to length in the edit' },
    }},
    { deliverable: 'long-form background music', tiers: {
        default: { tool: 'generate_music', note: 'up to 8 min; "consistent energy, no drops, loopable" for beds' },
        stems: { tool: 'separate_vocals', note: 'split an approved track into stems for mixing/ducking' },
    }},
    { deliverable: 'music video visualization', tiers: {
        default: { tool: 'create_music_video', note: 'MP4 visualization from a Suno track — social-post companion for a released track' },
    }},
  ],

  promptFormulas: {
    'jingle or brand track': {
      structure: '[genre + era] + [tempo/BPM + energy arc] + [instrumentation, 2-4 named instruments] + [mood words matching the brand attributes] + [structure: intro/hook/ending type] + [vocals: exact lyrics, or "instrumental"]',
      example: 'Upbeat indie-pop jingle, 118 BPM, bright and confident. Instrumentation: clean electric guitar, handclaps, warm synth bass, glockenspiel accents. Structure: 2s pickup, 10s hook with the sung line "Fresh from the coast", hard button ending, no fade. Mood: sunny, trustworthy, energetic.',
      pitfalls: [
        'Never prompt "sounds like [artist/song]" — describe the qualities instead; soundalikes are a rights problem AND get flagged.',
        'Proof sung lyrics like in-image text: every word, before generating and again in the output.',
        '"Hard button ending, no fade" or you get a fade-out you cannot un-fade.',
        'Commercial-use rights: confirm the kie/Suno terms cover the intended license before shipping paid work.',
      ],
    },
    'voiceover-narration': {
      structure: '[voice casting: age/register/energy/accent] + [pacing note] + [the script VERBATIM] + [tone tags inline where the read changes: [whispers], [laughs], [excited]]',
      example: 'Voice: warm female narrator, early 40s, unhurried, slight smile in the tone. Script: "Some mornings ask for more than coffee. [softly] This one has an answer." Even pacing, gentle emphasis on "answer".',
      pitfalls: [
        'Numbers, acronyms, and names: spell out the pronunciation you want ("A-P-I", "twenty twenty-six").',
        'Keep Gemini flash takes under 60s; switch to pro or ElevenLabs for long reads.',
        'Generate paragraph-length takes, not the whole script in one call — retakes stay cheap.',
      ],
    },
    'SFX set': {
      structure: '[the physical event] + [material/size] + [space/acoustics] + [duration] + [family note for sets: "same sonic palette as the previous"]',
      pitfalls: ['One effect per generation; describe the source, not the emotion ("glass marble dropped on oak, small room" beats "satisfying click").', 'UI families: keep instrumentation/palette words identical across the set.'],
    },
  },

  workflows: [
    { name: 'Sonic identity kit', steps: [
      'Brand attributes → 3 style directions as 30s sketches via generate_music (V5)',
      'Client picks; extend_music the winner into length variants (15s/30s/60s share one identity)',
      'generate_sfx the matching sonic logo sting from the same palette words',
      'separate_vocals for stems; deliver WAV masters at the destination loudness target',
    ]},
    { name: 'Podcast episode package', steps: [
      'Intro/outro bed once (generate_music, button ending) — reuse the same file every episode',
      'Per-episode narration via generate_gemini_tts (paragraph-length takes)',
      'Mix: VO on top, bed ducked ~-12dB under speech; master to ~-16 LUFS',
    ]},
    { name: 'Ad voiceover with dialogue', steps: [
      'Script proofed verbatim, casting per speaker written down',
      'generate_dialogue for the exchange; generate_gemini_tts for the tag line',
      'generate_sfx for the button; mix against the brand track',
    ]},
  ],

  qualityChecklist: [
    'Every sung/spoken word matches the approved text — listen through with the script in hand',
    'Endings are intentional (button vs fade); duration within spec after the trim',
    'Loudness at the destination target (~-14 LUFS streaming/social, ~-16 podcasts); no clipping',
    'WAV/master format for production handoff; MP3 only as a preview',
    'Series/identity work reuses the SAME files or extend_music continuations — no regenerated lookalikes',
    'No artist/song soundalike prompts; commercial-use rights confirmed for paid placements',
    'Voice clones only with documented consent on file',
    'SFX families share one sonic palette; UI sounds tested at phone-speaker volume',
  ],
}
