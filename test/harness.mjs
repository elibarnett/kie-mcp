// Reusable stdio JSON-RPC client for driving server.mjs in tests and smoke
// scripts (issue #41). Spawns the server, speaks MCP over stdin/stdout, and
// exposes rpc()/notify()/initialize(). Every prior debugging session rewrote
// this from scratch — now it lives in the repo.
//
// Usage:
//   import { McpClient } from './harness.mjs';
//   const c = await McpClient.start();        // spawns server, initializes
//   const tools = await c.listTools();
//   const res = await c.callTool('list_models', { filter: 'new' });
//   await c.close();

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const SERVER_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');

export class McpClient {
  constructor(child) {
    this.child = child;
    this.pending = new Map();
    this.nextId = 1;
    this.stderr = '';
    this._buf = '';
    child.stderr.on('data', (d) => { this.stderr += d.toString(); });
    child.stdout.on('data', (d) => this._onData(d));
  }

  _onData(d) {
    this._buf += d.toString();
    let i;
    while ((i = this._buf.indexOf('\n')) >= 0) {
      const line = this._buf.slice(0, i);
      this._buf = this._buf.slice(i + 1);
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id != null && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      }
    }
  }

  rpc(method, params, timeoutMs = 120000) {
    const id = this.nextId++;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`rpc timeout: ${method}`)); }
      }, timeoutMs);
    });
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return p;
  }

  notify(method, params) {
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  async initialize() {
    const res = await this.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'kie-mcp-test-harness', version: '1.0' },
    }, 15000);
    this.notify('notifications/initialized', {});
    return res.result;
  }

  async listTools() {
    return (await this.rpc('tools/list', {})).result.tools;
  }

  // Returns the tool's text content (first text block), or the raw result.
  async callTool(name, args, timeoutMs) {
    const res = await this.rpc('tools/call', { name, arguments: args }, timeoutMs);
    return res.result?.content?.[0]?.text ?? res.result;
  }

  close() {
    this.child.kill();
  }

  // Spawn + initialize in one call. opts.env is merged over process.env;
  // opts.apiKey sets KIE_API_KEY; opts.serverPath overrides the server file.
  static async start(opts = {}) {
    const env = { ...process.env, ...(opts.env || {}) };
    if (opts.apiKey) env.KIE_API_KEY = opts.apiKey;
    const child = spawn('node', [opts.serverPath || SERVER_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const client = new McpClient(child);
    await client.initialize();
    return client;
  }
}

// Read the kie-art API key from the user's Claude config, if present. Smoke
// scripts use this; unit tests never need a key.
export function apiKeyFromClaudeConfig() {
  try {
    const cfgPath = join(process.env.HOME || '', '.claude.json');
    return JSON.parse(readFileSync(cfgPath, 'utf8'))?.mcpServers?.['kie-art']?.env?.KIE_API_KEY || null;
  } catch {
    return null;
  }
}
