# Changelog

All notable changes to kie-mcp will be documented here.

## [5.1.0] — 2026-08-31

Complete-coverage release (#98–#100): profiles now span the full image + video + audio catalog, and the dead Sora family is gone.

### Added

- **social-video profile** (#99) — the first video vertical: TikTok/Reels/Shorts playbook with hook-first structure (the first 2 seconds are a creative input), the image-first cost discipline (approve a 4 cr still before spending 10–50x on video), platform UI safe zones, talking-head/avatar routing (kling avatar, omnihuman-1-5, infinitalk, volcengine re-dub) with platform AI-disclosure and voice-consent gates, multi-scene stories on kling-3-omni, b-roll loops via pixverse-v6/transition, and series consistency via reference-to-video (happyhorse-1-1 / minimax-h3 / seedance-2).
- **audio-branding profile** (#99) — the first audio vertical: Suno jingles and brand tracks with exact-lyrics proofing, Gemini/ElevenLabs voiceover and multi-speaker dialogue casting, SFX families, sonic logos, `extend_music` length variants of one sonic identity (never regenerated lookalikes), loudness targets per destination (~-14 LUFS streaming, ~-16 podcasts), and a hard voice-clone consent gate. 10 verticals total.
- **Video handoff tiers in the image verticals** (#100) — architecture gains a walkthrough-video deliverable, advertising a video-ad deliverable, product-photography a product-video deliverable — all on the animate-the-approved-still doctrine (the still carries the design/brand/label QA; video only adds motion). Film-storyboard's animatic handoff now names concrete models (pixverse-v6/transition first/last morph, minimax-h3 first→last interpolation).

### Removed

- **The Sora 2 family** (#98) — all 8 slugs (T2V/I2V, Pro, Characters ×2, Storyboard, Watermark Remover) return "temporarily paused" upstream as of the 2026-08-31 drift scan, ahead of OpenAI's September 24 API shutdown. Registry entries, pricing, MODEL GUIDE references, and README line removed so agents can no longer route to dead endpoints.

## [5.0.0] — 2026-08-26

The Vertical Profiles release (#91): kie-mcp now ships per-domain job intelligence alongside its per-model intelligence.

### Added

- **Vertical Profiles** (#91) — per-domain playbooks that brief the calling agent: the intake questions a professional would ask (each with a `why`), model routing per deliverable with budget tiers and live pricing, per-model prompt formulas with pitfalls, multi-tool workflows, and a quality checklist. Design conviction: the MCP briefs the agent, it never interrogates the user.
  - New **`profile_brief` tool**: no args → list profiles; `request` only → keyword-inferred profile (labeled, with alternatives); `profile` (+`request`) → the full brief.
  - **MCP prompts capability**: each profile registers as a server prompt → `/kie-art:<profile>` slash commands in supporting clients. First use of the prompts primitive.
  - **Referential integrity tests** (`test/profiles.test.mjs`): routing models must exist in registries, workflow tool mentions must be real tools, paused models are never recommended, briefs must render. The tests caught their first real bug during development (a tool slug routed as a model).
  - Phase-1 profiles: **Architecture & Interior Design**, **Video Game Assets** (8 asset types incl. pixel-grid, tileable-texture, and transparent-background techniques; consistent-character and icon-family workflows), and **Advertising & Marketing** (brand-hex handling, verbatim in-image copy rules, never-generate-the-logo, master→segment→edit A/B variant program)), and **Web & Software Product Imagery** (empty states, feature spots, icon families with locked style prefixes, onboarding sequences, og:images with safe zones, dark-mode pairs).
  - Phase-2 profiles (added pre-release): **Film & Storyboarding** (shot grammar, screen direction, mood-frame grading), **Product Photography & E-commerce** (real-product-via-references discipline, marketplace compliance, colorway variants via segment→edit), **Brand & Graphic Design** (letter-by-letter text proofing, logo-exploration-not-deliverable framing, pattern tiling), and **Editorial & Publishing** (illustrate-the-angle, series consistency, no-fake-data rules). 8 profiles total at launch.
  - Architecture gains a **renovation preview** deliverable (photo-edit change-list + mandatory preserve clause + iterate workflow) — added after a live A/B simulation showed the preserve-clause discipline is the difference between "the client's room renovated" and hallucinated geometry.
- **Expert-review pass across all 8 profiles** — each profile was critiqued by a domain-expert review (architecture, game art, advertising, product photography, storyboarding, brand identity, design systems, editorial) plus an Aug-2026 model-landscape research pass, then rewritten. Highlights:
  - **Corrected a systemic routing bug**: workflows no longer tell agents to `grok_segment_map` non-Grok masters (the segment→region-edit chain only works on `grok-imagine-image-2-0`-generated task_ids). Iterable/revision-ready tiers now generate ON grok-2.0 up front; foreign images route to whole-image edit, flux-kontext, or ideogram/v3-edit.
  - **nano-banana-2 promoted to workhorse default** in most profiles (4 cr, 4K, up to 14 refs, top-3 Arena); nano-banana-pro demoted to concept-heavy tiers with a verify-output caveat (documented quality-degradation windows). **gpt-image/2** is the default wherever baked text or multi-ref compositing dominates.
  - **JSON scene-spec technique** (read image → detailed JSON → modify fields → regenerate with the original as reference ingredient) validated live and encoded as a two-lane doctrine: instruction-edit lane (flux-kontext / gpt-image-2) when pixel fidelity matters, JSON lane (NB2/NB-Pro) for aspirational multi-attribute transforms — refs are ingredients, not a canvas, so the camera can drift.
  - New professional gates in intake: AI-disclosure policies (AP/Nature norms, Meta/TikTok branded-content, EU AI Act Art. 50, Steam disclosure), trademark screening, print CMYK/bleed, SVG-vs-raster handoff, Amazon pixel-verifiable compliance (exact 255,255,255, edge-clear shadows, ≥1600–2000px), true-21:9 via API param (never prompt "letterbox"), cliché bans, never-photorealistic-real-people rules, and dark-mode pairs via composition-locked i2i (seedream/5 and flux-2 have no seed param).

## [4.9.0] — 2026-08-26

August drift-sweep release (#75–#82): every gap between the MCP and current kie capabilities, one issue → one PR each.

### Added

- **MiniMax H3 (Hailuo-03)** (#81) — `minimax-h3/{text-to-video, image-to-video, reference-to-video}`: up to 2K with native stereo audio; I2V supports first→last-frame interpolation; R2V accepts reference images + videos + audio in one call (broadest reference surface on kie). Published: 768P 16 cr/s, 2K 26, +8 cr per extra input image, video refs billed at resolution rate. Docs now official (resolves the Aug-15 missing-card hold). `PRICING_ESTIMATED`.
- **Qwen Image 3.0 + Pro** (#80) — 4 entries: `qwen3/{text-to-image, image-to-image}` (4.8 cr flat, 1K or 2K) and `qwen3/pro-{text-to-image, pro-image-to-image}` (6.4 @1K / 12 @2K; note Pro slugs live under `qwen3/pro-*`). Modern controls the old qwen line lacked: seed, negative_prompt, prompt_extend, nsfw_checker toggle, `image_size` aspect param. Live-probed; Pro tiers in `PRICING_ESTIMATED`.
- **Seedream 5.0 Pro** (#79) — `seedream/5-pro-text-to-image` and `/5-pro-image-to-image` (7 cr @1K/1.5K, 14 @2K; I2I inputs 0.5 cr each, first free), plus the new **`seedream_layer_decompose` tool** — splits ANY image into independent layers (subject/text/background as separate files), optionally targeted with `<bbox>` tags; billed per output layer. Catalog-unique alongside Grok's segment map. Live-probed; `PRICING_ESTIMATED`.
- **Wan 3.0 + Wan 3.0 Prime** (#78) — `wan/3-0-video` and `wan/3-0-video-prime`: Alibaba's unified next-gen endpoint ("prompt or media" input), optional audio, 480P/720P/1080P. Published: standard 8/16/32 cr/s, Prime 12.2/25.2/50.4. NOTE the billing rule: (input video duration + output duration) × rate. Live-probed; `PRICING_ESTIMATED`.
- **Kling 3.0 Omni ("Kling O3")** (#77) — 4 entries: `kling-3-omni/{text-to-video, image-to-video, reference-to-video, transformation}` (API slugs `kling-3.0-omni/*` — docs paths differ). Unified multi-shot family: per-shot scripting via `customize_multi_shots` + `multi_prompt`, optional native audio, up to 4K, and a new **Transformation** modality (restyle existing video preserving motion, via `model_options.video_urls`). Published pricing: T2V/I2V/R2V 14 cr/s @720p no-audio (audio 18; 1080p 18/23; 4K 67); Transformation 20/27/67. All slugs live-probed; `PRICING_ESTIMATED`.

### Fixed

- **Seedance 2 Mini price cut: 20.5 → 8.2 cr/s** (#76) — kie now publishes tiers (480p 2.4 with-video / 3.8 no-video; 720p 5 / 8.2); table set to the entry's 720p no-video default, tiers noted, still in `PRICING_ESTIMATED`.
- **`grok_image_edit` now supports kie's new whole-image mode** (#75) — kie added an `image_urls` + `aspect_ratio` input mode to `grok-imagine-image-2-0/image-edit` (verified live 2026-08-26, 4 cr): instruction-based editing of ANY uploaded/external image, not just prior Grok generations. The tool accepts either mode with clear validation; the registry research entry and MODEL GUIDE no longer claim uploaded photos can't be edited (region-targeted `mask_indexs` editing still requires a 2.0-generated `task_id` — `segment-map` was re-probed and remains task-only).

## [4.8.0] — 2026-08-15

### Added

- **Grok Imagine Image 2.0** (`grok-imagine-image-2-0/text-to-image`) — xAI's editing-first image model, shipped Aug 7 and reported **#2 on both Arena text-to-image and image-edit leaderboards** (behind only gpt-image-2). 4 cr. Trained on photography/design/illustration with a typography emphasis. Full house-style `research` entry. xAI's own API is still "coming soon" — kie is early.
- **`grok_segment_map`** (new tool, **FREE**) — segments a Grok Image 2.0 generation into NAMED regions (index + semantic name + mask PNG, e.g. `[0] red apple`, `[1] wooden table`). Callers pick regions by name; no mask drawing.
- **`grok_image_edit`** (new tool, 4 cr) — edits only the chosen `mask_indexs` of a Grok Image 2.0 generation with a prompt; everything else preserved. Result task IDs chain back into segment/edit for iterative refinement at 4 cr per round. Supports `wait: false`.
- The generate → segment → edit chain is unique on kie: semantic surgical editing at 8 cr per round vs ~10 cr for one Flux Kontext Pro edit. Constraint (documented in the entry): the chain starts from a 2.0 *generation* task — it cannot segment/edit an uploaded photo (Kontext / NB Pro remain the tools for that).

### Verified

- Live end-to-end 2026-08-14 via raw API and 2026-08-15 through the MCP: T2I → segment (0 cr, 2 named regions) → background-only edit → valid JPEG. Empirical pricing exactly 4.0 / 0.0 / 4.0.

## [4.7.3] — 2026-08-10

### Changed

- **Seedance 2.5 un-paused — kie enabled the backend** (drift watch). Verified with a real generation 2026-08-10: 4s @480p succeeded in ~3 min and billed exactly **112 credits = the published 28 cr/s**. Entry's `paused` flag removed, description refreshed, pricing 25 (placeholder) → **63 cr/s** (720p no-video default; tiers: 480p 28/17-with-video, 720p 63/38 — kie now publishes these).

### Fixed

- **Four pricing drifts** flagged by `scripts/drift-watch.mjs` (all confirmed against kie's advertised `pricingDesc`):
  - `qwen/text-to-image` and `qwen/image-to-image`: 3 → **4** cr (kie raised both)
  - `grok-imagine/text-to-video`: 3 → **4.5** cr/s, `grok-imagine/image-to-video`: 3 → **2.4** cr/s (kie published resolution tiers 2.4/4.5/8; each table value matches its entry's default resolution — T2V defaults 720p, I2V 480p)
  - `bytedance/v1-lite-text-to-video` / `-image-to-video`: 3 → **4.5** cr/s (published tiers 2/4.5/10; entries default 720p)
  - All four added to `PRICING_ESTIMATED` (resolution-tiered rates)
- Drift-watch false positive noted, no change: Gemini TTS is advertised in tokens (140/1M in, 2,800/1M audio out) while our 4.2 cr/min is the derived per-minute figure backed by the 0.75-actual measurement from 4.7.0.

### Checked, nothing to do

- Sora: all 8 slugs still paused (guard active). No docs-page removals in any family the MCP depends on. MiniMax H3 (new family, 3 slugs verified routing) tracked separately for v4.8.

## [4.7.2] — 2026-08-06

### Added

- **`upload_file` accepts `file_path`** (#68, #70) — absolute local path; the server reads and streams the bytes itself via kie's multipart `file-stream-upload` endpoint. No base64 anywhere in the chain, so the ~11.7K-char tool-argument truncation (#68) and the atob failure class (#62) cannot occur. This is now the recommended route for every image-to-image / image-to-video / reference-image workflow on stdio setups. `base64_data` remains for remote/HTTP-mode callers, with the observed transit ceiling documented in the schema and the truncation error pointing at `file_path` as the remedy. 100MB guard; filename inferred from the path.

### Fixed

- **Wan 2.6 Flash pricing corrected 2 → 6 cr/s** (#69) — kie publishes no rate for the Flash tier (the standard Wan 2.6 page prices 14/21 cr/s @720p/1080p); our 2 cr/s was an unlabeled guess. Empirical measurement (issue #69: six consecutive 5s takes at exactly 30 credits; a second run averaged 8 cr/s) sets the table to 6 cr/s, added to `PRICING_ESTIMATED` with the 6-8 range noted. `wan/flash-video-to-video` assumed same, marked estimated. MODEL GUIDE updated (including the `wan/flash` → `wan/2-6-flash` alias note) and the stale "2 cr/s" claim in the PixVerse research comparison refreshed.

## [4.7.1] — 2026-08-05

### Fixed

- **Veo aspect ratios corrected — `1:1` was never supported** (#65). All six Veo entries advertised `16:9, 9:16, 1:1`, but kie's Veo docs and live probes (all three tiers, creation-time 422 "Ratio error") show the real enum is **`16:9 | 9:16 | Auto`** — so callers following `list_models` paid a failed submission to learn it. Entries corrected (also gaining the previously-missing `Auto`); the existing client-side validator now rejects `1:1` locally and free with the valid list. Non-Veo models sharing that ratio list were left untouched — only Veo was verified upstream.
- **`generate_image` / `generate_video` / `download_result` now return the result URL(s)** alongside the local path (#66). Image-to-image chaining needs the public URL for the next call's `image_urls`, and the URLs are NOT pattern-stable (path segment alternates `/ggc/`↔`/vnp/`, suffix format varies) — reconstructing them fails with a misleading "image fetch failed" error. The output now includes the verbatim URLs with an explicit "not pattern-stable, never guess them; temporary ~24h" warning, eliminating the per-link `check_task` round-trip.

### Verified

- Live (2026-08-05): `1:1` on `veo-3-fast/image-to-video` fails client-side, free, listing `16:9, 9:16, Auto`; a `generate_image` Result URL fed verbatim into a second call succeeded (chaining proven end-to-end via the free subject-detection model). Veo probes: 9 I2V ratio combinations tested at zero cost (bogus-URL creations).

## [4.7.0] — 2026-07-27

July model pass — everything the drift watch (#44) surfaced in its first scheduled window, researched in the house Averiguare style with docs-scraped schemas and empirical pricing where possible.

### Added

**Video (6 new entries):**

- **PixVerse V6** (`pixverse-v6/text-to-video`, `/image-to-video`, `/transition`, `/reference-to-video`, `/extend`) — AISphere's budget all-rounder (~Elo 1330, top-4 I2V-no-audio; T2V is its weaker modality): native audio in-pass, 1-15s up to 1080p, viral effect templates (`template_id`), first→last-frame **Transition** morphing (no registry equivalent), **Fusion** R2V with up to 7 typed refs addressed as `@ref_name`, and chainable **Extend** (taskId XOR video_url) — the cheapest path to 30-60s continuous footage. kie published per-second tiers (360p 4.0 → 1080p+audio 18.4/20.7); table prices the 720p no-audio default (7.2 / 8.1 R2V). **360p rate empirically confirmed: a 4s clip consumed exactly 16.00 credits (4.0 cr/s).**
- **Seedance 2.5** (`bytedance/seedance-2-5`) — ByteDance's 30s-single-take flagship, ships **⏸ paused**: the slug routes and accepts tasks, but every generation fails server-side ("internal error", 0 credits — verified twice, T2V and I2V) and kie's page still says Coming Soon. Entry is fully probed (480p/720p only — no 4K on kie despite the marketing; duration 4-30s; Mini-style fields) and ready — remove the `paused` flag when kie enables the backend. Pricing unpublished; 25 cr/s placeholder in `PRICING_ESTIMATED`.

**Audio (1 new tool):**

- **`generate_gemini_tts`** — Google Gemini native TTS (flash = Gemini 3.1 Flash TTS, most expressive, inline tone tags like `[whispers]`, best <60s; pro = Gemini 2.5 Pro TTS, stabler long-form; same price). 30 named voices, up to 2 speakers with per-speaker accent/style/pace, `scene`/`sample_context` direction, simple mode (`text` + `voice_name`) or dialogue mode (`speakers` + `dialogue_turns`). Token-priced upstream ≈ **4.2 credits per minute of audio** — cheaper than every ElevenLabs tier. **Verified live end-to-end: 0.75 credits actual for a short clip, real WAV downloaded.**

### Fixed

- **Wan 2.7 image pricing drift** (drift watch): `wan/2-7-image` 4 → **4.8** cr, `wan/2-7-image-pro` 8 → **12** cr (kie raised both).

### Notes

- All 8 slugs verified live 2026-07-27: 2 full generations (PixVerse 16 cr, Gemini TTS 0.75 cr) + zero-cost probes for the rest. The `pixverse/*` docs URLs are misleading — the real slugs are `pixverse-v6/*` (caught by probing).
- Out-of-scope kie additions correctly skipped: Gemini 2.5/3/3.6 chat models, Claude Opus 5, GPT-5.6 (kie's LLM API, not generation).

## [4.6.4] — 2026-07-13

### Fixed

- **`upload_file` base64 now tolerates dirty input instead of failing with kie's opaque `atob` error** (#62). kie's uploader rejects any non-conformant base64 with a confusing doubled "Base64 decoding failed: … atob() … invalid base64-encoded data" message. A new `normalizeBase64` step runs before the upload: strips a `data:<mime>;base64,` prefix, removes whitespace/newlines (encoders wrap at 76 cols; the MCP transport can insert them — the most likely real cause), and maps base64url (`-`/`_`) to standard. If the payload is still invalid it returns an **actionable client-side error** ("length N not a multiple of 4 — likely truncated in transit; re-send or use file_url") instead of passing corrupt data to kie. Verified live: clean and newline-wrapped JPEGs upload; a truncated payload returns the clear error.
- Tool schema note added: very large images can be truncated when passed as a tool argument — prefer `file_url` with a public URL for those.

## [4.6.3] — 2026-07-12

### Fixed

- **CRITICAL: the server never started when launched via `npx kie-mcp` or a global bin** (regression in 4.4.2's #41, affected 4.4.2–4.6.2). npx/global installs invoke through a bin symlink (`.bin/kie-mcp → ../kie-mcp/server.mjs`), so `process.argv[1]` was the symlink path while `import.meta.url` resolved to the realpath. The main-module guard's plain `===` compare failed, so the module loaded (no error, no output) but **never connected its stdio transport** — the MCP silently appeared "down". `isEntrypoint()` now resolves symlinks on both sides (`realpathSync`) before comparing, so `node server.mjs`, `npx kie-mcp`, and global-bin invocations all start correctly. Direct-import (tests) still short-circuits, unchanged. Regression-tested with a real symlink.

## [4.6.2] — 2026-07-12

### Fixed

- **Corrected stale `PRICING` for models the drift watch (#44) flagged** — kie's advertised rates had moved well past our table:
  - `happyhorse/*` (1.0 T2V/I2V/R2V/Video Edit): `8`/`10` cr/s (a competitive-positioning guess) → **48** cr/s (kie published 28 @720p, 48 @1080p — the entries' default). These were never officially priced before.
  - `wan/2-5-text-to-video` / `-image-to-video`: `3` → **12** cr/s (kie published 12 @720p default, 20 @1080p); added to `PRICING_ESTIMATED`.
  - `grok-imagine/upscale`: `5` → **10** cr (flat, kie published).
- Refreshed the now-false "8 cr/s estimate" claims in the HappyHorse 1.0 `costEfficiency` research notes to the real published rates. (Verdicts/comparisons still carry their `lastResearched: 2026-05-05` date — a full re-research is a separate task.)

All three clear the drift watch after the fix; the runtime `[actual]` cost from #42 remains ground truth regardless.

## [4.6.1] — 2026-07-12

### Changed

- **Split the model registries, pricing, and voice catalog out of `server.mjs`** into `data/*.mjs` (#46): `registry-image.mjs`, `registry-video.mjs`, `registry-audio.mjs`, `pricing.mjs`, `voices.mjs`. `server.mjs` shrank from ~5480 to ~2740 lines and imports (and re-exports) them, so model-catalog PRs are now reviewable data diffs instead of edits buried in one huge file. Behavior is byte-identical — `tools/list` and `list_models` output verified unchanged before/after, all 32 unit tests pass, and the modules are added to the npm `files` list so they ship with the package. No functional change.

## [4.6.0] — 2026-07-12

### Added

- **Suno custom-voice cloning tools** (#20, EXPERIMENTAL): `prepare_voice_clone` (validate a vocal sample — FREE), `create_voice_clone` (finish the voice from the owner's verification recording → `voiceId` for `generate_music`), and `regenerate_voice_clone`. `check_task` recovers voice tasks via the `/api/v1/voice/record-info` endpoint and surfaces the `voiceId` / next-step. These wrap kie's consent-gated cloning flow: submit a sample → kie sends a verification phrase to your `KIE_CALLBACK_URL` → the voice **owner** records it → you submit that recording. **⚠️ Only clone a voice you own or have explicit permission to use.**

### Notes

- The FREE `prepare_voice_clone` path is verified live end-to-end (validate → `wait_validating` → `check_task` shows the next step). The `create_voice_clone` completion step is **not verified end-to-end** — it needs a real `KIE_CALLBACK_URL` (the verification phrase is callback-delivered) and a human recording, so it ships experimental. `create/regenerate` pricing is a 5-credit estimate (`PRICING_ESTIMATED`); validate is free.
- `check-voice` was intentionally **not** shipped — its endpoint requires an undocumented `suno_user_id` and always 422'd; `check_task` covers "is the voice ready" via task status.

## [4.5.2] — 2026-07-12

### Fixed

- **`convert_to_wav`, `create_music_video`, `generate_midi`, and `separate_vocals` were broken end-to-end** (#53). kie moved these operations' result records to dedicated endpoints (`/api/v1/{wav,mp4,midi,vocal-removal}/record-info`) with a `successFlag` + `response.<urlFields>` shape, but the tools still polled `/api/v1/generate/record-info` — which returns `data: null` for them — so every call timed out despite the output being produced. They now poll the correct endpoint (`pollSunoRecord`), extract result URLs shape-agnostically (`collectUrls` walks `response` for any http(s) URL), and download all of them (`separate_vocals` correctly yields distinct vocal + instrumental stems). `check_task`/`download_result` recover these via the specialized endpoints too, and all four gained `wait: false` async mode now that recovery works.
- **Multi-task restore from the persisted history log was broken** (regression in 4.5.1's #43). `loadTaskHistory` called `trackTask(...entries)` — but `trackTask` takes a *single* entry (the #43 helper-conversion accidentally rewrote the bulk push), so on restart only the **first** persisted task was restored and it was re-appended to the log each time. Now bulk-pushes all entries without re-appending. Found while testing #53's recovery path.

### Verified

- Live (2026-07-12): WAV task recovered as a single file and a vocal-removal task recovered as two distinct stems (885KB + 2.2MB) via `check_task`/`download_result` on the specialized endpoints; both restored together from a 2-entry persisted log. New unit tests cover `collectUrls`, `normalizeTaskState`, and the specialized-record path through `extractResultUrls`.

## [4.5.1] — 2026-07-11

### Added

- **`taskHistory` now persists to disk** (`kie/assets/task-history.jsonl`, gitignored) and reloads on startup (#43). A server restart — or a crash mid-generation, exactly when recovery matters — no longer empties `list_tasks` or loses the model/filename hints the recovery path uses. Every task registration and status change appends a line; on load, entries are deduped by taskId (last write wins, so terminal status is kept) and capped to the most recent 500, with the file compacted when it grows past 4×. All I/O is best-effort and never breaks a generation.

### Verified

- Live (2026-07-11): created a task with `wait:false`, killed the server, started a fresh one → `list_tasks` showed the task and `download_result` **with no filename argument** used the persisted filename to save the result. New unit test covers the dedupe/cap/skip-junk parsing.

## [4.5.0] — 2026-07-11

### Added

- **`wait: false` async mode extended to the slow music-family Suno tools** (#45): `extend_music`, `cover_audio`, `add_instrumental`, `add_vocals`, `replace_section`, `upload_extend_audio`, `generate_mashup`. Like the 4.2.0 set, they now submit and return the task_id in ~0.5s (verified: 457ms) instead of blocking for minutes; recover with `check_task` → `download_result`. Each also gained the `max_wait_seconds` blocking-budget override.

### Notes

- Deliberately EXCLUDED `convert_to_wav`, `create_music_video`, `generate_midi`, and `separate_vocals`: these create via specialized kie endpoints whose result records live on specialized record endpoints (e.g. WAV is on `/api/v1/wav/record-info`, not the `/generate/record-info` that `check_task`/`download_result` query), so their async outputs aren't recoverable yet. Worse, this endpoint drift means their BLOCKING paths are likely broken too — filed as #53. They'll get `wait:false` once #53 teaches the recovery path those endpoints.

## [4.4.3] — 2026-07-11

### Changed

- **`generate_image` / `generate_video` success messages now report the ACTUAL credits charged** (`creditsConsumed` from the completed task) instead of a PRICING-table estimate, tagged `[actual]`. The estimate was wrong whenever the caller deviated from the default config — e.g. Seedance 2 Mini at 480p charges 38 credits but the table default (720p) estimated ~82. Falls back to the labeled estimate only when kie omits the field. `check_task` shows the same actual cost line.
- Added a `[pricing-drift]` stderr warning when the actual charge diverges >25% from the table rate, so registry numbers can be corrected over time (feeds the drift watch, #44).

### Verified

- Live (2026-07-11): free subject-detection → `Cost: 0 credits [actual]`; nano-banana-2-lite → `Cost: 4 credits [actual]` (the real charge). New unit tests cover the actual-vs-estimate selection, the free/0 case, the drift-log threshold, and the estimate fallback.

## [4.4.2] — 2026-07-11

Test infrastructure (#41). No user-facing behavior change.

### Added

- **Offline unit tests** (`test/unit.test.mjs`, `node:test`) for the pure helpers that a long string of bug-fix PRs turned into branchy logic: `extractResultUrls` (all 6+ result shapes), Suno take-naming (#23), `classifyKieCode` buckets (#25), `sanitizeFilename`/`resolveOutputDir` (#24), `pollBudgetMs` precedence (#22), `coerceDuration` (#28), prompt-cap enforcement (#27), `getCostEstimate`, and `resolveVoice`. 21 assertions, ~130ms, no network. `npm test`.
- **Reusable stdio test harness** (`test/harness.mjs`) — the JSON-RPC client every prior debugging session rewrote by hand — and a **live smoke test** (`test/smoke.mjs`, `npm run smoke`) that runs a full generate → check_task → download_result cycle on the free subject-detection model (~0 credits).
- **CI** (`.github/workflows/ci.yml`): syntax check + unit tests on Node 20 and 22 for every push/PR, plus a registry-sanity check (model counts + package.json/server.json version sync). An opt-in live-smoke job runs on manual dispatch (needs a `KIE_API_KEY` repo secret).

### Changed

- `server.mjs` now guards its side effects (the missing-key exit and transport startup) behind a main-module check, so importing it for tests no longer starts a server. Two behavior-preserving extractions — `coerceDuration` and `sunoTrackName` — make that logic unit-testable. The runtime server behaves identically.

## [4.4.1] — 2026-07-11

### Fixed

- **`download_dir` was missing from the `generate_image` and `generate_video` tool schemas** — the 4.3.0 insertion matched only single-line `filename` schema declarations, and these two tools (the highest-traffic ones) declare `filename` as a multi-line block, so agents couldn't discover the parameter. The handlers already honored `download_dir` (verified live), so this is a discoverability fix, not a behavior change; both schemas now advertise it like the other 21 file-writing tools.

## [4.4.0] — 2026-07-11

Agent-feedback pass 10 of 10 (#30) — closes out the July field-report batch.

### Added

- **Internal concurrency gate for task creation.** Field reports measured failure rates climbing with parallel generations, forcing agents to self-throttle to sequential. Creation calls (createTask + all Suno-family creates) now pass through a semaphore (default 4 in flight, `KIE_MAX_CONCURRENT` to tune); excess calls queue with a stderr log instead of failing. Polling and downloads are unthrottled.
- **Bounded submission retries while holding the slot**: 429/433 rate-limit responses and `[retryable]` failures retry the submission up to 2 more times (2s, 5s backoff) — safe because a failed creation billed nothing; nothing post-submission is ever auto-retried. Supersedes the single-retry from 4.3.1 with the same guarantee.
- `kieRequest` refactored into `kieAttempt` (single HTTP try) + gate/retry orchestration; non-creation calls bypass both.

### Verified

- Live (2026-07-11): 8 simultaneous free subject-detection generations → 8/8 succeeded, exactly 4 queued behind the cap-4 gate (stderr `concurrency gate` events), none surfaced a rate-limit error.

## [4.3.5] — 2026-07-11

Agent-feedback pass 9 (#29).

### Fixed

- **`upload_file` base64 docs were backwards** — the schema said "with MIME prefix" but the upstream endpoint only accepts RAW base64, so agents following the docs failed. Both forms now work: a `data:<mime>;base64,` prefix is detected and stripped, and its MIME type infers the file extension when `file_name` is omitted. Schema descriptions corrected.
- **Non-public `file_url`s now fail fast with an explanation.** localhost/127.x/10.x/192.168.x/172.16-31.x/`.local`/`.internal` URLs are rejected client-side ("kie.ai's servers cannot reach this — use base64_data for local files"); genuine upstream fetch failures get the public-reachability note appended instead of a bare error dump.
- **`URL: undefined` in every base64 upload response** (pre-existing): the upload API returns `downloadUrl` but the success message only read the absent `fileUrl`. Now falls back correctly and shows filename/size, plus the ~3-day expiry when the API omits `expiresAt`.

### Verified

- Live (2026-07-11): raw base64 → uploaded; `data:image/png;base64,…` → uploaded with auto-inferred `.png` name and a real URL in the response; `http://localhost:3000/x.png` → client-side rejection, no upstream call.

## [4.3.4] — 2026-07-11

Agent-feedback pass 8 (#28).

### Fixed

- **`duration` is now coerced to whatever type each model actually wants.** kie is silently type-strict per model — `5` fails where `"5"` works and vice versa, and the registry mixed string-enum durations (kling 2.x/3.x, legacy grok: `'5'`,`'10'`) with numeric ones (happyhorse, seedance, grok 1.5: 3–15). `generate_video` now coerces `model_options.duration` to the declared option type BEFORE validation, so enum/min/max checks also see the right type; a non-numeric value against a numeric spec gets a clear client-side error. The two legacy grok buildInputs additionally `String()` their defaults (belt and braces).

### Verified

- Live (2026-07-11, zero-cost bogus-URL creations with wire capture): `duration: 10` (number) on legacy grok I2V → body sent `"duration":"10"`, accepted; `duration: "5"` (string) on HappyHorse I2V → body sent `"duration":5`, accepted; `duration: "abc"` → client-side `is not a number`, no API call.

## [4.3.3] — 2026-07-11

Agent-feedback pass 7 (#27).

### Added

- **Documented prompt caps enforced client-side for 50 models.** Scraped every market model's docs page for the prompt `maxLength` (same &quot;-escaped-JSON technique as the 4.1.0 pass) and shipped the results as a `PROMPT_CAPS` table consulted by the validator — over-limit prompts now fail instantly with the actual cap and the count, instead of burning a roundtrip on kie's bare 422. Notable footguns found: **qwen2 and Wan 2.5 cap at 800 chars**, Hailuo 02 and Wan 2.6 Flash at 1500, qwen image-edit at 2000; the common ceiling is 5000; ByteDance V1 takes 10000 and Seedance 2 20000. Models whose docs state no limit are deliberately absent — no guessed numbers.
- Validator lookup order: per-entry `maxPromptChars` → `PROMPT_CAPS[apiModel]` → `PROMPT_CAPS[registry key]` (entries without an explicit apiModel use their key as the API slug).

### Notes

- The field report's "~500 chars" could not be reproduced against any currently-documented limit — the closest candidates are the 800-char qwen2/Wan-2.5 caps, or the since-paused Sora family. If a bare 422 on a long prompt still appears, the model's cap is undocumented; report the model id.

### Verified

- Live (2026-07-11): 990-char prompt on qwen2 → client-side "documented max of 800" (zero API calls); 1610-char prompt on hailuo/text-to-video → "documented max of 1500".

## [4.3.2] — 2026-07-11

Agent-feedback pass 6 (#26).

### Fixed

- **`generate_dialogue`'s unhelpful 422s tracked to their real causes and closed.** Investigation showed per-segment voices WERE already validated against the catalog (4.0.5) — the bare `422: refer to the documentation` came from elsewhere:
  - **`voice_id` in a segment (generate_tts's param name) was silently ignored** — the segment fell back to the default voice, collapsing multi-speaker dialogue onto one voice with no error. Segments now accept `voice`/`voice_id` interchangeably, and a segment with NEITHER throws the full-catalog error naming the segment index instead of silently defaulting.
  - **`stability` accepts exactly 0 / 0.5 / 1 upstream** but had no client-side check — anything else (e.g. 0.7) became kie's bare 422. Now validated client-side with a clear message; schema carries the enum.
  - Any remaining upstream 422 from the dialogue endpoint gets the endpoint's constraints appended so callers can self-correct without doc-diving.

### Verified

- Live (2026-07-11): bogus voice in segment 2 → full catalog client-side, zero API calls; `voice_id` alias accepted and task submitted; `stability: 0.7` → clear enum error; segment with no voice → `dialogue[1] has no voice` + catalog.

## [4.3.1] — 2026-07-11

Agent-feedback pass 5 (#25).

### Added

- **Machine-readable error taxonomy.** Every upstream failure is now prefixed with a bucket agents can key retry logic off, instead of string-matching kie's prose: `[retryable]` (429/455/5xx transient, "try again later", "server is busy"), `[fatal-client]` (401/402/404/422/433/505 and kie's 500-coded validation messages like "not within the range of allowed options" — retrying unchanged will fail identically), `[fatal-task]` (generation failed after submission — typically not billed, safe to retry with changed inputs), and `[recoverable]` (poll timeout — task may still succeed; poll, don't resubmit; pairs with the #21 recovery block).
- **One automatic retry (2s backoff) for `[retryable]` failures of task CREATION only** — creation failed means nothing was billed, so the retry is safe; nothing that might have partially succeeded is ever retried. Field reports showed intermittent Suno 500 flickers needing manual retry-up-to-3 even on good days.

### Fixed

- **Mid-poll transient flickers no longer kill a running task.** `pollOnce` previously tolerated only malformed-JSON responses; a stray 429/455/5xx from a recordInfo endpoint aborted the whole poll. Retryable-bucket errors are now logged and retried next iteration (the poll budget still bounds total wait).

### Verified

- Live (2026-07-11): garbage task_id → `[fatal-client] … 422: recordInfo is null`; bogus-URL Volcengine generation → `[fatal-task] Task failed …` + task_id line, 0 credits consumed. Note kie's prose for that failure is literally "server is busy" — which is why buckets derive from task state and code, not message text alone.

## [4.3.0] — 2026-07-11

Agent-feedback pass 4 (#24).

### Added

- **Per-call `download_dir` on all 23 file-writing tools.** Downloads previously always landed in the MCP server's cwd (`<server cwd>/kie/assets/raw/`) regardless of the caller's working directory — every worktree agent needed a copy step, and one stalled outright hunting for its file. Any tool with a `filename` parameter now also accepts `download_dir` (absolute path, created if missing); relative paths are rejected with an explanation, since "relative to what" is exactly the ambiguity that caused the bug. `KIE_PROJECT_ROOT` remains the server-wide default.

### Fixed

- **Path-traversal hygiene**: `filename` is now stripped to its basename everywhere (24 assignment sites + `download_result`) — `filename: "../../x.png"` can no longer write outside the target directory. Multi-take Suno downloads honor `download_dir` too (`downloadSunoTracks` takes an explicit output dir).

### Verified

- Live (2026-07-11, free subject-detection model): relative `download_dir` rejected with the explanatory error; absolute `download_dir` auto-created and used; `filename: "../../escape-attempt.png"` landed as `escape-attempt.png` INSIDE the target dir, nothing written outside.

## [4.2.1] — 2026-07-11

Agent-feedback pass 3 (#23).

### Fixed

- **Multi-take Suno results no longer silently overwrite each other.** `downloadSunoTracks` derived take 2's filename by regex-replacing the expected extension — a no-op whenever the caller's `filename` had no extension (or a different one), so every take resolved to the SAME path and take 2 clobbered take 1 (Suno music returns 2 takes; agents lost one per generation). The helper now splits base/extension itself and always emits `base.ext`, `base-2.ext`, … regardless of input shape — one fix covers all 10 call sites (music, sfx, sounds, extend, cover, add-instrumental/vocals, replace-section, mashup, stems, upload-extend, download_result). Overwrites of pre-existing files are now logged to stderr.

### Verified

- Live repro (2026-07-11): `generate_sfx filename="overwrite-repro"` (no extension — the failing shape) produced `overwrite-repro.mp3` **and** `overwrite-repro-2.mp3` with distinct contents (134KB / 43KB).

## [4.2.0] — 2026-07-11

Agent-feedback pass 2 (#22): kill the watchdog-stall class.

### Added

- **Async mode (`wait: false`)** on the seven high-traffic generation tools (`generate_image`, `generate_video`, `generate_music`, `generate_sfx`, `generate_sounds`, `generate_tts`, `generate_dialogue`): the tool submits the task and returns immediately (<1s) with the task_id, target filename, and the check_task → download_result steps. Long generations no longer hold a blocking tool call open for minutes — the pattern that was tripping agents' no-progress watchdogs. Blocking mode stays the default.
- **One poll-budget table replaces 25 hardcoded numbers.** Defaults per category: image 600s, video 900s, audio 300s, speech 300s — overridable globally via `KIE_POLL_BUDGET_<CATEGORY>` env vars and per call via `max_wait_seconds` (30–3600). The worst offenders are gone: `generate_tts` polled for only **60s** against a queue that routinely runs 2–3 min/clip, `generate_dialogue`/`audio_isolation` for 120s, and several Suno tools (lyrics 60s, wav/stems/midi 120s) below realistic queue times. Field reports showed exactly these tools timing out on generations that later succeeded.

### Verified

- Live (2026-07-11): `generate_image wait:false` returned in 435ms with the task_id; `check_task` polled waiting→success; `download_result` fetched the 540KB PNG. Schema for `wait`/`max_wait_seconds` visible over `tools/list`.

## [4.1.1] — 2026-07-11

Agent-feedback pass 1 of the July batch (#21): timeouts must never cost a re-bill.

### Fixed

- **Poll timeouts now return an actionable recovery path instead of a dead end.** Field reports showed agents re-submitting (and re-billing) generations whose first attempt succeeded upstream after the MCP's poll budget expired. Every error thrown from `pollTask`/`pollSunoTask` now carries its `taskId`; the top-level handler appends an explicit recovery block — "the task may still be RUNNING upstream and has likely been billed — do NOT retry" plus literal `check_task task_id=…` → `download_result task_id=… filename=…` steps. Task-failed errors get a shorter task_id + check_credits pointer.
- **`check_task` / `download_result` now work for every tool family, making them a universal recovery path.** Both previously queried only `/api/v1/jobs/recordInfo`, which can miss Suno-family tasks. A new `fetchTaskRecord` resolver tries the endpoint implied by the session's task history first, then falls back through market and Suno (`/api/v1/generate/record-info`) endpoints, normalizing the three record shapes (state / status / successFlag) into one. `download_result` additionally understands Suno `sunoData` track results (downloads all takes) and defaults the filename to the one recorded at task creation, so the extension is right.
- **11 handlers polled without registering in `taskHistory`** (generate_tts, generate_dialogue, audio_isolation, generate_lyrics, convert_to_wav, separate_vocals, generate_midi, create_music_video, generate_persona, generate_cover_art, speech_to_text) — their tasks were invisible to `list_tasks` and lost on timeout. All now push before polling; the error handler also flips the entry's status to `timeout`/`failed` so `list_tasks` reflects reality.

### Verified

- Live end-to-end (2026-07-11): a TTS generation with an artificially shrunk 8s poll budget timed out with the full recovery block, then `check_task` reported success and `download_result` retrieved the 38KB MP3 — no second generation, no double billing. A Suno-created lyrics task was also resolved by `check_task` from a fresh server process (empty task history), proving the endpoint-fallback path.

## [4.1.0] — 2026-07-02

New-model pass: 10 new registry entries covering the kie.ai models that landed June 2026, all researched in the house Averiguare style, with docs-scraped input schemas and empirical pricing where cheap enough to probe.

### Added

**Video (9 new entries in VIDEO_MODEL_REGISTRY):**

- **HappyHorse 1.1** (`happyhorse-1-1/text-to-video`, `/image-to-video`, `/reference-to-video`) — Alibaba's June 22 successor to 1.0. Adds native synchronized audio with 7-language lip-sync, 9 aspect ratios, 3-15s durations, and R2V with up to 9 refs addressed as `[Image N]` in the prompt. #2 with-audio on Artificial Analysis (behind Seedance 2.0) — and note it does NOT beat 1.0 on silent T2V, so the 1.0 entries stay. Priced from kie's published rates (22.5 cr/s @720p, 29 cr/s @1080p default) — a premium over the 1.0 estimate.
- **Kling 3.0 Turbo** (`kling/v3-turbo-text-to-video`, `/image-to-video`) — June 17 speed tier of Kling 3.0: keeps vCoT reasoning, 6-shot multi-shot, bundled audio + 5-language lip-sync; caps at 1080p. NOT a budget tier — 18 cr/s @720p / 22.5 @1080p sits above Kling 3.0 (12 cr/s).
- **Seedance 2.0 Mini** (`bytedance/seedance-2-mini`) — ByteDance's budget 2.0 tier with the FULL multimodal ref stack (9 images + 3 videos + 3 audio), 480p/720p, 4-15s. 480p rate empirically confirmed: a 4s 480p clip consumed exactly 38.00 credits (9.5 cr/s); 720p published at 20.5 cr/s.
- **Grok Imagine Video 1.5 preview** (`grok-imagine-video-1-5-preview`) — xAI Aurora engine, 1-15s, native synced audio, 720p max, #1 debut on I2V Arena. **Probed live: the preview snapshot is image-to-video ONLY** — `createTask` rejects any request without `image_urls` ("This field is required") even though kie's docs mark it nullable, so the entry carries `requiresImage: true`. 720p rate empirically confirmed at exactly 3 cr/s (12 credits for 4s); 480p published at 1.6 cr/s — cheapest with-audio video model in the registry.
- **OmniHuman 1.5** (`omnihuman-1-5`) — ByteDance's audio-driven avatar model (image + audio ≤60s → full-body emotion-matched performance, per-character audio routing via masks). Premium at kie's published 27 cr/s.
- **Volcengine Video Lip-Sync** (`volcengine/video-to-video-lip-sync`) — re-syncs the mouth of existing footage to new audio (dubbing/localization; video 3-350s, lite/basic modes). 8 cr/s published. No prompt — takes `video_url` + `audio_url` via `model_options`.

**Image (2 new entries in MODEL_REGISTRY):**

- **Nano Banana 2 Lite** (`nano-banana-2-lite`) — Gemini 3.1 Flash-Lite Image (June 30), ~4s generation, 1K-only, up to 10 input images, 15 aspect ratios. **Empirical pricing: exactly 4.00 credits per image — kie's site advertises 3 but the balance delta says 4**, which makes it the same price as nano-banana-2 on kie; the win is speed, not cost. Verified end-to-end over MCP stdio (14s round-trip).
- **OmniHuman 1.5 Subject Detection** (`omnihuman-1-5/subject-detection`) — companion utility that returns mask images for up to 5 subjects; feed masks to `omnihuman-1-5` via `mask_url` for multi-person scenes. **Empirically FREE (creditsConsumed: 0)**, verified end-to-end (returns a grayscale PNG mask). The sibling `omnihuman-1-5/human-identification` endpoint was deliberately NOT added: it only pre-validates that an image is animatable, and OmniHuman itself fails fast with a clear error, so the pre-check adds a roundtrip without saving cost.

### Fixed

- `extractResultUrls` now understands `resultObject.mask_urls` (the subject-detection result shape) — without it the task succeeded but the tool reported "no result URLs".
- `getCostEstimate` reports "free (0 credits)" for zero-priced models instead of falling through to "unknown".

### Notes

- All 10 slugs verified live against `POST /api/v1/jobs/createTask` (2026-07-02): 4 full generations (NB2 Lite, Grok 1.5, Seedance Mini, subject-detection ×2) plus zero-cost field-name probes for the expensive models (bad-enum and bogus-URL requests fail server-side with `creditsConsumed: 0`).
- New per-second video entries are in `PRICING_ESTIMATED` because kie's rates vary by resolution (and for Seedance Mini by video-input presence) — the single PRICING number assumes each model's default config.
- Sora entries untouched (paused upstream — see #18 / v4.0.6).
- kie's new **Suno Voice API** (custom voice creation: generate / validate / regenerate / check-voice / record-info) was scoped out of this release to keep it reviewable — tracked in a follow-up issue.

## [4.0.6] — 2026-06-11

### Fixed

- **All 8 Sora tools failed with an opaque upstream error** — kie.ai has paused its entire Sora 2 family (`500: This interface is temporarily paused` on every sora-2 slug, verified 2026-06-11; likely ahead of OpenAI's Sept 24, 2026 API sunset). The registry entries now carry a `paused` flag: `generate_video` refuses paused models immediately with an explanation and alternatives (no API call), and `list_models` renders a `⏸ [PAUSED upstream — do not use]` marker so the model picker steers to Veo/Kling/Seedance. Sora recommendations removed from the `generate_video` tool description and README examples. Entries are kept (not deleted) in case kie un-pauses before the sunset.

### Verified still healthy (docs pages moved, APIs fine)

- `gpt4o` image, `flux-kontext-pro`/`max`, `ideogram/v3-reframe`, and the Kling 3.0 mapping (`kling-3/video` → `apiModel: kling-3.0/video`) were all confirmed live — no changes needed.

## [4.0.5] — 2026-06-11

### Fixed

- **TTS/dialogue voices were effectively locked to the default** — kie.ai only accepts its curated set of ~67 voices and rejects every other ElevenLabs voice ID with "This voice is not within the range of allowed options" (verified live: allowlisted ID → 200, real-but-unlisted ElevenLabs ID → 500). The MCP gave callers no way to discover the allowed set. Now ships the full catalog (scraped from kie's docs, shared by turbo-2-5, multilingual-v2, and text-to-dialogue-v3): `generate_tts` and `generate_dialogue` accept a voice **name** ("Bella", "Viking Bjorn", "Aria") or allowlisted ID, validate client-side, and an unknown value returns the complete name/vibe/ID catalog so agents self-correct without burning a request. Note two pairs of duplicate names (Mark, Hope, Jessica Anne Bogart, Viraj ×2 each) — use IDs to disambiguate those.

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

[4.7.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.7.1
[4.7.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.7.0
[4.6.4]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.6.4
[4.6.3]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.6.3
[4.6.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.6.2
[4.6.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.6.1
[4.6.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.6.0
[4.5.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.5.2
[4.5.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.5.1
[4.5.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.5.0
[4.4.3]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.4.3
[4.4.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.4.2
[4.4.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.4.1
[4.4.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.4.0
[4.3.5]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.5
[4.3.4]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.4
[4.3.3]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.3
[4.3.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.2
[4.3.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.1
[4.3.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.3.0
[4.2.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.2.1
[4.2.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.2.0
[4.1.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.1.1
[4.1.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.1.0
[4.0.6]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.6
[4.0.5]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.5
[4.0.4]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.4
[4.0.3]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.3
[4.0.2]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.2
[4.0.1]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.1
[4.0.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.0
