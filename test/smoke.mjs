// Cheap live smoke test over MCP stdio (issue #41). Exercises the real server
// end-to-end against the kie.ai API using only free/zero-cost operations:
//   - initialize + tools/list
//   - list_models
//   - a full generate → check_task → download_result cycle on the FREE
//     omnihuman-1-5/subject-detection model (creditsConsumed: 0)
//
// Needs a KIE_API_KEY (from env, or the kie-art entry in ~/.claude.json).
// Run: npm run smoke     (or: node test/smoke.mjs)

import { McpClient, apiKeyFromClaudeConfig } from './harness.mjs';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FREE_IMG = 'https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png';

function assert(cond, msg) {
  if (!cond) { console.error(`✗ ${msg}`); process.exitCode = 1; throw new Error(msg); }
  console.log(`✓ ${msg}`);
}

const apiKey = process.env.KIE_API_KEY || apiKeyFromClaudeConfig();
if (!apiKey) {
  console.error('smoke: no KIE_API_KEY (env or ~/.claude.json kie-art) — skipping live smoke.');
  process.exit(0);
}

const outDir = join(tmpdir(), `kie-smoke-${process.pid}`);
const client = await McpClient.start({ apiKey });
try {
  const tools = await client.listTools();
  assert(tools.length > 30, `tools/list returned ${tools.length} tools`);
  assert(tools.some((t) => t.name === 'generate_image'), 'generate_image tool present');

  const models = await client.callTool('list_models', { filter: 'new' });
  assert(typeof models === 'string' && models.includes('nano-banana-2-lite'), 'list_models surfaces new models');

  // Full async recovery cycle on the free model, into a temp download_dir.
  const submit = await client.callTool('generate_image', {
    prompt: 'smoke', model: 'omnihuman-1-5/subject-detection',
    image_urls: [FREE_IMG], filename: 'smoke.png', download_dir: outDir, wait: false,
  });
  const taskId = String(submit).match(/Task ID: (\S+)/)?.[1];
  assert(taskId, `wait:false returned a task_id (${taskId})`);

  let state = '';
  for (let i = 0; i < 30 && state !== 'success'; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    state = String(await client.callTool('check_task', { task_id: taskId })).match(/State: (\S+)/)?.[1] || '';
  }
  assert(state === 'success', `check_task reached success (${state})`);

  await client.callTool('download_result', { task_id: taskId, filename: 'smoke.png', download_dir: outDir });
  assert(existsSync(join(outDir, 'smoke.png')), 'download_result wrote to the requested download_dir');

  console.log('\nSmoke test passed.');
} finally {
  client.close();
  try { rmSync(outDir, { recursive: true, force: true }); } catch { /* ignore */ }
}
