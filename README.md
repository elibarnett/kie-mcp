# kie-mcp

A comprehensive **Model Context Protocol** server for the [kie.ai](https://kie.ai) generation API. Gives Claude (and any MCP client) access to **47+ image models**, **80+ video models**, and **20+ audio tools** with deep model intelligence built in.

## Why this exists

Most MCPs are thin API wrappers. This one is different:

- **Deep research embedded** — Every major model has a `research` field with verdicts, prompt techniques, weaknesses, cost-efficiency analysis, and competitor comparisons. Researched by **Averiguare**, our model intelligence agent.
- **Cost-aware** — Every model has pricing in credits and USD. The MCP tells you the cheapest option for your use case.
- **Smart filtering** — `list_models filter="lip sync"` or `filter="architecture"` or `filter="cheapest video"` — searches across capability tags, descriptions, AND research fields.
- **Dual-mode transport** — stdio for local Claude Code, HTTP Streamable for remote Cowork/cloud usage.

## What you can do with it

Just ask Claude things like:
- *"Generate a brand presentation board for a perfume launch"* — picks GPT Image 2 (best for text-heavy layouts)
- *"Make a 10s video of fruit scarecrows defending against crows, Pixar style"* — recommends Veo 3.1 or Wan 2.7
- *"Generate music for a fantasy adventure game"* — Suno V5
- *"Lip-sync this audio to my character image"* — Kling AI Avatar or Infinitalk
- *"Upscale this video to 4K"* — Veo 4K upscale or Topaz
- *"Replace the wall color in this room photo"* — Flux Kontext Pro (best for surgical edits)

## Model coverage

### Image (47+)
- **OpenAI**: GPT Image 2 (NEW), GPT-4o Image, GPT Image 1.5
- **Google**: Nano Banana 2 / 2 Lite (NEW) / Pro / Edit / Original, Imagen 4 (Fast/Standard/Ultra)
- **Black Forest Labs**: Flux Kontext Pro/Max, Flux 2 Pro/Flex
- **ByteDance**: Seedream 3.0 / 4.0 / 4.5 / 5.0 Lite
- **Alibaba**: Wan 2.7 Image / Image Pro
- **Ideogram**: v3, Character, Edit, Remix, Reframe
- **Others**: Qwen/Qwen2, Z-Image, Grok Imagine, Recraft, Topaz

### Video (80+)
- **Google Veo 3.1**: Quality / Fast / Lite (T2V + I2V), Extend, 1080p/4K upscale
- **Alibaba HappyHorse**: 1.1 (NEW — T2V/I2V/R2V with native audio + 7-language lip-sync), 1.0 (T2V/I2V/R2V/Video Edit)
- **ByteDance Seedance**: 2.0 / 2.0 Fast / 2.0 Mini (NEW) / 1.5 Pro
- **OpenAI Sora 2** ⏸: T2V/I2V, Pro, Characters, Storyboard, Watermark Remover — *paused upstream by kie.ai (June 2026); OpenAI sunsets the Sora API Sept 2026*
- **Kuaishou Kling**: 3.0, 3.0 Turbo (NEW), 2.6, V2.5 Turbo, V2.1 Master/Pro/Standard, AI Avatar
- **Alibaba Wan**: 2.7 (T2V/I2V/Edit/R2V), 2.6, 2.5, 2.2 Turbo, Animate
- **MiniMax Hailuo**: 2.3 Pro/Standard, 02 Pro/Standard
- **xAI Grok Imagine**: Video 1.5 preview (NEW — I2V with native audio, cheapest audio video), T2V, I2V, Upscale, Extend
- **Avatar / lip-sync**: OmniHuman 1.5 (NEW — audio-driven full-body avatar + free subject-detection utility), Volcengine Video Lip-Sync (NEW — re-dub existing footage), Kling AI Avatar, Infinitalk
- **Runway**: Aleph, Aleph Edit, Extend
- **Others**: ByteDance V1 Pro/Lite, Topaz upscale

### Audio (20+)
- **Suno**: Music Gen, Extend, Cover, Add Instrumental/Vocals, Replace Section, Lyrics, Sounds, Sound Effects, MIDI, Music Video, Cover Art, Mashup, Persona, Timestamped Lyrics, Boost Style, Vocal Separation, WAV
- **ElevenLabs**: TTS (Turbo 2.5 + Multilingual V2), Text-to-Dialogue V3, Audio Isolation, Speech-to-Text

### Utility
- File upload (URL or base64)
- Veo Extend, 1080p Upscale, 4K Upscale
- Runway Extend
- Task status, credit check, raw asset listing

## Installation

### Prerequisites
- Node.js 18+
- A kie.ai API key from [kie.ai/api-key](https://kie.ai/api-key)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/kie-mcp.git
cd kie-mcp
npm install
```

### Run as stdio MCP (Claude Code, Claude Desktop)

Add to your Claude config (`~/.claude.json` for Claude Code, or your MCP client's equivalent):

```json
{
  "mcpServers": {
    "kie-art": {
      "command": "node",
      "args": ["/absolute/path/to/kie-mcp/server.mjs"],
      "env": {
        "KIE_API_KEY": "your-kie-ai-api-key",
        "KIE_PROJECT_ROOT": "/optional/path/for/outputs"
      }
    }
  }
}
```

Or use the Claude Code CLI:

```bash
claude mcp add -s user kie-art /usr/bin/env -- KIE_API_KEY=your-key node /path/to/server.mjs
```

### Run as HTTP MCP (Cowork, remote clients)

```bash
KIE_API_KEY=your-key node server.mjs --http --port=3100
```

Then expose via ngrok / Cloudflare Tunnel / VPS deployment:
```bash
ngrok http 3100
```

Configure your MCP client to use the resulting URL:
```json
{
  "mcpServers": {
    "kie-art": {
      "type": "http",
      "url": "https://your-tunnel.ngrok-free.dev/mcp"
    }
  }
}
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `KIE_API_KEY` | yes | Your kie.ai API key |
| `KIE_PROJECT_ROOT` | no | Server-wide default for where generated files are saved (default: server cwd; files go to `$KIE_PROJECT_ROOT/kie/assets/raw/`). Per-call `download_dir` (absolute path) on any file-writing tool overrides this |
| `KIE_MCP_PORT` | no | Port for HTTP mode (default: 3100) |
| `KIE_CALLBACK_URL` | no | Callback URL sent with Suno generation requests (kie.ai requires the field; results are fetched by polling regardless). Defaults to an inert placeholder — set this only if you want to receive the callbacks yourself |
| `KIE_MAX_CONCURRENT` | no | Max simultaneous task-creation calls (default 4). Excess parallel generations queue inside the server instead of hitting kie.ai's rate limits — parallel tool calls are safe |
| `KIE_POLL_BUDGET_IMAGE` / `_VIDEO` / `_AUDIO` / `_SPEECH` | no | Blocking-mode polling budget per tool category, in seconds (defaults: 600 / 900 / 300 / 300). Per-call `max_wait_seconds` takes precedence. For long generations prefer `wait: false` (async mode): the tool returns the `task_id` immediately; poll with `check_task`, fetch with `download_result` |

## Tools available

```
generate_image, generate_video, generate_music, generate_sfx,
generate_tts, generate_dialogue, generate_sounds, generate_lyrics,
generate_persona, generate_mashup, generate_cover_art,
generate_midi, create_music_video,
create_omni_voice, create_omni_character,
extend_music, cover_audio, upload_extend_audio,
add_instrumental, add_vocals, replace_section,
convert_to_wav, separate_vocals, boost_style,
get_timestamped_lyrics, audio_isolation, speech_to_text,
list_models, check_task, list_tasks, check_credits,
download_result, list_raw_assets, upload_file,
veo_extend, veo_upscale_1080p, veo_upscale_4k, runway_extend
```

## Smart model recommendations

Try these queries in any MCP client:

```
list_models filter="reasoning"          # GPT-4o, Nano Banana, GPT Image 2
list_models filter="lip-sync"           # OmniHuman 1.5, Volcengine, Kling Avatar, HappyHorse 1.1
list_models filter="multi-shot"         # Kling 3.0/Turbo
list_models filter="cheapest video"     # Grok Imagine 1.5, Wan Flash
list_models filter="alibaba"            # HappyHorse 1.0/1.1 family
list_models filter="best visual quality" # Veo Quality, Seedance 2.0
list_models filter="text rendering"     # Ideogram v3, GPT Image 2
list_models filter="character"          # Ideogram Character, Kling AI Avatar
```

## Architecture

```
server.mjs                      # The whole server (~4000 lines)
├── PRICING                     # Credit cost per model
├── MODEL_REGISTRY              # Image models (47+)
├── VIDEO_MODEL_REGISTRY        # Video models (80+)
├── AUDIO_TOOLS_REGISTRY        # Audio tool metadata
├── createMcpServer()           # Factory for stdio + HTTP modes
└── Tool handlers               # generate_*, list_*, etc.
```

Each model entry has:
- `name`, `description`, `capabilities` (tags), `pricing` (credits)
- `aspectRatios`, `options` (with types and defaults)
- `buildBody` / `buildInput` (request builders)
- **`research`** (Averiguare verdicts, prompt techniques, weaknesses, comparisons, sources)

## Development

```bash
npm run check   # node --check server.mjs (syntax)
npm test        # offline unit tests for the pure helpers (test/*.test.mjs)
npm run smoke   # live end-to-end over MCP stdio — needs KIE_API_KEY
                # (spends ~0 credits; uses the free subject-detection model)
```

`server.mjs` guards its side effects behind a main-module check, so it can be imported by tests (`test/unit.test.mjs`) to exercise the pure helpers without starting a server. `test/harness.mjs` is a reusable stdio JSON-RPC client for driving the real server in smoke/integration checks. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the syntax check + unit tests on Node 20 and 22 for every push and PR.

### Drift watch

kie.ai changes things without notice — advertised prices, model availability, even API shapes. [`.github/workflows/drift-watch.yml`](.github/workflows/drift-watch.yml) runs [`scripts/drift-watch.mjs`](scripts/drift-watch.mjs) weekly (and on demand) to scan for it: paused/removed slugs, pricing that no longer matches the `PRICING` table, and new models in kie's catalog. Findings land in a single rolling GitHub issue. Add a `KIE_API_KEY` repo secret to enable the per-slug liveness probes (0 credits — empty-input validation errors); the pricing and new-model scans need no secret. Run locally with `node scripts/drift-watch.mjs`.

## Releasing

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml). To cut a release:

1. Bump the version in `package.json`, `server.json` (both the top-level `version` and `packages[0].version`), and `server.mjs` (`SERVER_INFO` + the `/health` handler), and add a `## [X.Y.Z]` section to `CHANGELOG.md`. Merge to `main`.
2. Tag and push:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

The workflow verifies the tag matches every in-repo version string, publishes to npm with provenance (`NPM_TOKEN` repo secret), and creates the GitHub Release using the matching CHANGELOG section as the notes. A tag whose version doesn't match the code fails fast without publishing. `workflow_dispatch` is an emergency manual publish of the current `package.json` version.

## Credits

- Built with the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [kie.ai](https://kie.ai) — affordable unified API for 100+ AI models
- Model intelligence by **Averiguare** — *"No sabes hasta que averiguas — y averiguo en todas partes."*

## License

MIT
