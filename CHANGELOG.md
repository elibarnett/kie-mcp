# Changelog

All notable changes to kie-mcp will be documented here.

## [4.0.4] — 2026-06-11

### Fixed

- **`generate_music` failed with `422: Please enter callBackUrl`** — kie.ai began rejecting Suno generation requests without a callback URL, even though results remain fully available via polling. All 17 async Suno-family create calls (music, sounds, extend, cover, add-instrumental/vocals, replace-section, persona, mashup, upload-extend, lyrics, WAV, vocal separation, MIDI, music video, cover art) now go through a `sunoCreate` helper that always sends a `callBackUrl`. Defaults to an inert placeholder since the MCP polls; set `KIE_CALLBACK_URL` to receive real callbacks. Synchronous endpoints (`boost_style`, `get_timestamped_lyrics`) are unaffected. Verified live: music generation without a callback 422s, with the placeholder completes in ~30s with 2 tracks.

## [4.0.3] — 2026-06-11

### Fixed

- **`generate_sfx` was completely broken** — kie.ai silently removed `elevenlabs/sound-effect-v2`. `createTask` still accepts the slug, but every generation fails server-side with `failCode: 500, "internal error, please try again later"` (0 credits consumed), and the model's docs page is gone from docs.kie.ai (other ElevenLabs pages remain). Verified 2026-06-11 with live probes including a minimal `{text}`-only request. `generate_sfx` now routes through Suno V5's sound generator (`/api/v1/generate/sounds`) — same tool name and input schema, so existing callers keep working. `duration_seconds` is folded into the prompt as a hint (Suno has no hard duration control); `prompt_influence` is accepted but ignored (no Suno equivalent). Pricing: 3 cr flat → 5 cr flat (`suno/generate-sounds`). For loop/BPM/key control, `generate_sounds` remains the richer interface.
- **`generate_sounds` (and now `generate_sfx`) returned "done but no results" on success** — the sounds operation nests results under `data.response.sunoData`, but every handler reads `pollResult.sunoData` one level up. `pollSunoTask` now lifts `response.sunoData` to the top of the returned object on success, fixing all 14 call sites at once. Verified end-to-end over MCP stdio: `generate_sfx` → 2 valid 48 kHz MP3s downloaded in ~27s.

### Known issues

- **`generate_tts` without `voice_id` fails at task creation** — kie.ai now returns `422: voiceId cannot be empty`; the default-voice behavior the tool description promises no longer exists upstream. Tracked in #8.

## [4.0.2] — 2026-06-01

Post-release patch pass. No new models — just bug fixes, validation hardening, accurate pricing, and Docker / docs hygiene.

### Fixed

- **`generate_video` upscale handlers were silently broken** — `veo_upscale_4k` could never extract the URL (kie returns `code: 422` even on success with `data.resultUrls` plural; our handler looked for singular `resultUrl` via `kieRequest` which throws on non-200). `veo_upscale_1080p` also threw mid-poll (kie returns `code: 500` during processing). Both rewritten with a tolerant fetch helper + dual singular/plural URL extraction.
- **Polling could abort mid-task** on transient malformed JSON from `/api/v1/jobs/recordInfo`. `kieRequest` now throws a typed `KieMalformedResponseError` and `pollTask` / `pollSunoTask` catch it as a transient — log and retry next iteration. Non-polling callers still treat parse failures as fatal.
- **Cross-model option validation** in `generate_image` / `generate_video` — `aspect_ratio` checked against each model's declared `aspectRatios`; option-level `enum`/`min`/`max` enforced client-side. The low-level MCP SDK doesn't validate per-tool inputSchemas, so typos previously surfaced as opaque kie.ai errors.
- **`gemini-omni/video` buildInput hardening**: arrays now type-checked (`Array.isArray`) and sliced to documented caps (`image_urls` ≤ 7, `audio_ids` ≤ 3, `character_ids` ≤ 3, `video_list` ≤ 1). Empty arrays no longer forwarded. Reference asset quota (`images + videos×2 + character_ids ≤ 7`) enforced up-front. `duration` `String()`-coerced. Per-model `maxPromptChars: 20000` cap enforced via the validator.
- **`create_omni_voice` schema**: `audio_id` is now a proper `enum` with all 30 preset voice IDs; `name`, `voice_description`, `example_dialogue` carry the documented `maxLength` (210 / 20000 / 120).
- **`create_omni_character` schema + handler**: `image_urls` carries `minItems: 1, maxItems: 1`; `audio_ids` carries `maxItems: 3` and items type. Handler validates `image_urls` shape up front; empty `audio_ids` no longer forwarded; response ID extraction puts docs-confirmed `characterId` first.
- **`gemini-omni/video` array options** now declare `items` spec (string for `audio_ids`/`character_ids`, object for `video_list` with documented `{url, start, ends?}` shape) — improves `list_models` verbose rendering and gives LLM tool-callers a typed hint.
- **Omni IDs are now discoverable via `list_tasks`** — `create_omni_voice` and `create_omni_character` push to `taskHistory` so the IDs survive context compaction or scroll.
- **`create_omni_voice` success message** now matches `create_omni_character`'s explicit `"only consumed by model='gemini-omni/video'"` — users won't try to pass `audio_ids` to Veo/Sora and silently have it ignored.
- **AUDIO_TOOLS_REGISTRY categorization** — `create_omni_voice` / `create_omni_character` changed from misleading `category: 'video'` to `category: 'character'`. `'video'` added to their `capabilities` so existing filter-by-video search still surfaces them.
- **`Dockerfile.local`**: `npm install` → `npm ci` for reproducible builds from the lockfile.
- **New `.dockerignore`** to keep `kie/assets/raw/`, `node_modules/`, and repo metadata out of the Docker build context (was streaming multi-GB of generated assets on every rebuild).

### Changed

- **Veo family PRICING numbers replaced with empirically-measured values.** Probed each tier 2026-06-01 with a single live API call per slug; captured exact `creditsConsumed` via balance deltas. Old estimates were wrong by between -75% and +110%:
  - `veo-3/*` (T2V/I2V): 50 → 31.25 cr/s (250 cr per 8s clip; matches kie's marketing for Quality)
  - `veo-3-fast/*`: 10 → 21 cr/s (168 cr per 8s clip — likely Veo 3.1 Fast under the slug)
  - `veo-3-lite/*`: 5 → 3.75 cr/s (30 cr per 8s clip)
  - `veo/extend`: 50 → 31.25 cr/s (assumed same as Quality)
  - `veo/1080p`: 20 → 5 cr (flat)
  - `veo/4k`: 80 → 120 cr (flat)
- Kept in `PRICING_ESTIMATED` because per-second rates may vary across other resolutions/durations/aspect ratios — only one config per tier was probed.

## [4.0.1] — 2026-05-21

### Added

- **Gemini Omni Video** (`gemini-omni/video`) — Google's "anything from anything" multimodal video model (launched May 19, 2026). Text + up to 7 images + 3 audio + 1 video + 3 character IDs → coherent video up to 4K (default 720p; opt into 1080p/4k).
- **`create_omni_voice`** — Create reusable voice IDs for Gemini Omni. Picks from 30 preset base voices (achernar, achird, algenib, …) and customizes via `voice_description` and `example_dialogue`. Returns a `kieAudioId` for use in `generate_video model_options.audio_ids`.
- **`create_omni_character`** — Create reusable visual character IDs from an image (+ optional voice IDs). Returns a `characterId` for use in `generate_video model_options.character_ids`.
- **Self-hosted Docker** — `Dockerfile.local` and `docker-compose.yml` for building HTTP MCP from local source (faster iteration than the npm-based `Dockerfile`).

### Workflow

`create_omni_voice` → `create_omni_character` (passing the voice ID) → `generate_video model='gemini-omni/video'` (passing both IDs).

## [4.0.0] — 2026-05-11

### Initial public release

The first open-source release of kie-mcp. This is the culmination of months of internal iteration.

### Models supported

**Image (45+)**
- OpenAI: GPT Image 2, GPT-4o Image, GPT Image 1.5
- Google: Nano Banana 2 / Pro / Edit / Original, Imagen 4 (Fast/Standard/Ultra)
- Black Forest Labs: Flux Kontext Pro/Max, Flux 2 Pro/Flex
- ByteDance: Seedream 3.0 / 4.0 / 4.5 / 5.0 Lite
- Alibaba: Wan 2.7 Image / Image Pro
- Ideogram: v3, Character, Edit, Remix, Reframe
- Qwen, Qwen2, Z-Image, Grok Imagine, Recraft, Topaz

**Video (70+)**
- Google Veo 3.1 (Quality / Fast / Lite) — T2V, I2V, Extend, 1080p/4K Upscale
- Alibaba HappyHorse 1.0 — T2V, I2V, R2V, Video Edit (#1 on Artificial Analysis Arena)
- ByteDance Seedance 2.0 / 2.0 Fast / 1.5 Pro
- OpenAI Sora 2 — Standard/Pro, Characters, Storyboard, Watermark Remover
- Kuaishou Kling — 3.0, 2.6, V2.5 Turbo, V2.1 Master/Pro/Standard, AI Avatar
- Alibaba Wan — 2.7, 2.6, 2.5, 2.2 Turbo, Animate
- MiniMax Hailuo — 2.3 Pro/Standard, 02 Pro/Standard
- xAI Grok Imagine — T2V, I2V, Upscale, Extend
- Runway — Aleph, Aleph Edit, Extend
- ByteDance V1 Pro/Lite, Topaz, Infinitalk

**Audio (20+)**
- Suno: Music Gen, Extend, Cover, Add Instrumental/Vocals, Replace Section, Lyrics, Sounds, MIDI, Music Video, Cover Art, Mashup, Persona, Timestamped Lyrics, Boost Style, Vocal Separation, WAV
- ElevenLabs: TTS (Turbo + Multilingual), Text-to-Dialogue V3, SFX, Audio Isolation, Speech-to-Text

**Utility**
- File upload (URL + base64)
- Veo Extend, 1080p Upscale, 4K Upscale
- Runway Extend

### Features

- **Dual-mode transport**: stdio for Claude Code, HTTP Streamable for Cowork/remote
- **Smart model recommendations**: `list_models filter="lip-sync"` searches across capability tags, descriptions, and embedded research
- **Cost-aware**: every model has credit cost and USD estimate
- **Averiguare research embedded**: 40+ models have deep verdicts, prompt techniques, weaknesses, and competitor comparisons researched from official benchmarks (Artificial Analysis Arena), community reports (Reddit, Twitter), and professional reviews
- **Multi-session HTTP**: each MCP client gets its own session via `mcp-session-id` header
- **CORS enabled** for browser-based clients

### Internal history (pre-public)

The MCP went through 4 major internal iterations before this release:
- v1.0: Basic stdio MCP, GPT-4o + Flux Kontext only
- v2.0: Expanded to 35+ models, added video support
- v3.0: Added pricing system, capability tags, smart filtering
- v3.1-3.2: Added Seedance 2.0, Wan 2.7, and 20+ more models
- v4.0: Dual-mode transport, Averiguare research integration, GPT Image 2, HappyHorse, complete Suno coverage

[4.0.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.2
[4.0.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.1
[4.0.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.0
