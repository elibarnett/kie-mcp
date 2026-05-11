# Changelog

All notable changes to kie-mcp will be documented here.

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

[4.0.0]: https://github.com/elibarnett/kie-mcp/releases/tag/v4.0.0
