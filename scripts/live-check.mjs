// kie.ai live check — the full maintenance routine in one command:
//
//   1. Docs-index diff   — pages added/removed on docs.kie.ai since the last run
//                          (the most reliable new-model signal; cached in .live-check/)
//   2. Drift watch       — pricing drift, slug liveness (with a key), catalog groups
//   3. Watch-list probes — REAL calls to models known to be down upstream, so we
//                          notice when they come back (failures are not billed)
//   4. Dependency audit  — npm audit summary
//
// Writes live-check-report.md (gitignored) and prints it. Run from your machine:
// GitHub-hosted runners can't fetch kie.ai pages (see drift-watch).
//
//   npm run live-check            (KIE_API_KEY from env, else ~/.claude.json kie-art)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiKeyFromClaudeConfig } from '../test/harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.live-check');
const KEY = process.env.KIE_API_KEY || apiKeyFromClaudeConfig();
const H = KEY ? { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Models that were failing upstream at last check. A success here means the MCP
// can be updated (e.g. unpause ElevenLabs). Keep probes cheap — a failure costs 0.
export const WATCH_LIST = [
  {
    label: 'ElevenLabs TTS (paused in the MCP since 5.4.0)',
    model: 'elevenlabs/text-to-speech-turbo-2-5',
    input: { text: 'Live check.', voice: 'Rachel' },
    onRecovery: 'ElevenLabs works again — set ELEVENLABS_PAUSED = null in server.mjs (or KIE_ELEVENLABS_ENABLED=1) and release.',
  },
];

// Pure: which docs pages appeared / disappeared between two llms.txt snapshots.
export function diffDocsIndex(prevText, nextText) {
  const pages = (t) => new Map(
    [...String(t).matchAll(/\[([^\]]+)\]\((https:\/\/docs\.kie\.ai\/(?!cn\/)[^)]+\.md)\)/g)].map((m) => [m[2], m[1]]),
  );
  const a = pages(prevText);
  const b = pages(nextText);
  const short = (u) => u.replace('https://docs.kie.ai/', '');
  return {
    added: [...b].filter(([u]) => !a.has(u)).map(([u, title]) => ({ page: short(u), title })),
    removed: [...a].filter(([u]) => !b.has(u)).map(([u, title]) => ({ page: short(u), title })),
    count: b.size,
  };
}

async function docsSection() {
  const res = await fetch('https://docs.kie.ai/llms.txt', { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
  if (!res?.ok) return '### 📚 Docs index\nCould not fetch docs.kie.ai/llms.txt.';
  const next = await res.text();
  mkdirSync(CACHE, { recursive: true });
  const prevPath = join(CACHE, 'llms.txt');
  const prev = existsSync(prevPath) ? readFileSync(prevPath, 'utf8') : null;
  writeFileSync(prevPath, next);
  if (!prev) return `### 📚 Docs index\nBaseline saved (${diffDocsIndex('', next).count} pages). The next run will show what changed.`;
  const d = diffDocsIndex(prev, next);
  if (!d.added.length && !d.removed.length) return `### 📚 Docs index\nNo changes (${d.count} pages).`;
  return [
    `### 📚 Docs index — ${d.added.length} added, ${d.removed.length} removed (${d.count} pages)`,
    ...d.added.map((p) => `- ➕ **${p.title}** — ${p.page}`),
    ...d.removed.map((p) => `- ➖ ${p.title} — ${p.page}`),
    '_Chat-model pages (claude/, chat/, gemini/ chat, grok/) are out of scope for this media MCP._',
  ].join('\n');
}

function driftSection() {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/drift-watch.mjs')], {
    cwd: ROOT, env: { ...process.env, ...(KEY ? { KIE_API_KEY: KEY } : {}) }, encoding: 'utf8', timeout: 15 * 60 * 1000,
  });
  const body = (r.stdout || '').replace(/^DRIFT_FINDINGS=.*$/m, '').replace(/^# 🔭 kie\.ai drift watch\n*/m, '').trim();
  return `### 🔭 Drift watch\n${body || `drift-watch produced no output (${(r.stderr || '').split('\n')[0]})`}`;
}

async function probe(entry) {
  const c = await (await fetch('https://api.kie.ai/api/v1/jobs/createTask', { method: 'POST', headers: H, body: JSON.stringify({ model: entry.model, input: entry.input }) })).json().catch(() => ({}));
  if (!c.data?.taskId) return `- ❌ ${entry.label}: create failed (${c.code} ${c.msg})`;
  for (let i = 0; i < 45; i++) {
    await sleep(4000);
    const d = (await (await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${c.data.taskId}`, { headers: H })).json().catch(() => ({}))).data || {};
    if (d.state === 'success') return `- ✅ **${entry.label}: WORKING again** (${d.creditsConsumed} cr). ${entry.onRecovery}`;
    if (d.state === 'fail') return `- ❌ ${entry.label}: still failing — "${d.failMsg}" (0 cr)`;
  }
  return `- ⏳ ${entry.label}: no result after 3 min`;
}

async function watchSection() {
  if (!H) return '### 👀 Watch list\nSkipped — no KIE_API_KEY.';
  const lines = await Promise.all(WATCH_LIST.map(probe));
  return `### 👀 Watch list (models down upstream at last check)\n${lines.join('\n')}`;
}

function auditSection() {
  const r = spawnSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8' });
  try {
    const v = JSON.parse(r.stdout).metadata?.vulnerabilities || {};
    // metadata.vulnerabilities carries per-severity counts AND a `total` — don't add it twice.
    const total = v.total ?? Object.entries(v).filter(([k]) => k !== 'total').reduce((a, [, n]) => a + n, 0);
    const bySeverity = Object.entries(v).filter(([k, n]) => k !== 'total' && n).map(([k, n]) => `${n} ${k}`).join(', ');
    return `### 🔒 Dependencies\n${total ? `⚠️ ${total} vulnerabilities (${bySeverity}) — run \`npm audit\`` : '✅ npm audit: 0 vulnerabilities'}`;
  } catch {
    return '### 🔒 Dependencies\nnpm audit unavailable.';
  }
}

async function main() {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const [docs, watch] = await Promise.all([docsSection(), watchSection()]);
  const report = [`# 🩺 kie.ai live check — ${stamp} UTC`, docs, driftSection(), watch, auditSection()].join('\n\n');
  writeFileSync(join(ROOT, 'live-check-report.md'), report + '\n');
  console.log(report);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error('live-check failed:', e.message); process.exit(1); });
}
