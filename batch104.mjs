/**
 * batch104.mjs — 104 職缺批次評估完整流程
 *
 * 串接 pipeline-to-batch.mjs 與 batch-runner.sh，跨平台自動找 bash。
 *
 * 使用方式：
 *   npm run batch104                   # 全部 pending
 *   npm run batch104 -- --max 20       # 只取前 20 筆
 *   npm run batch104 -- --dry-run      # 預覽，不執行
 *   npm run batch104 -- --parallel 2   # 並行 2 個 worker
 */

import { spawnSync, execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Find bash ─────────────────────────────────────────────────────────────────

function findBash() {
  const candidates = [
    '/bin/bash',
    '/usr/bin/bash',
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Try PATH
  try {
    const result = spawnSync('where', ['bash'], { encoding: 'utf-8', shell: false });
    if (result.status === 0) return result.stdout.trim().split('\n')[0].trim();
  } catch { /* continue */ }
  try {
    const result = spawnSync('which', ['bash'], { encoding: 'utf-8', shell: false });
    if (result.status === 0) return result.stdout.trim();
  } catch { /* continue */ }
  return null;
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const maxIdx = args.indexOf('--max');
const max = maxIdx !== -1 ? args[maxIdx + 1] : null;
const parallelIdx = args.indexOf('--parallel');
const parallel = parallelIdx !== -1 ? args[parallelIdx + 1] : null;
const append = args.includes('--append');

// ── Step 1: pipeline-to-batch ─────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log('  batch104 — 104 職缺批次評估');
console.log('══════════════════════════════════════════════════\n');

const prepArgs = ['pipeline-to-batch.mjs'];
if (dryRun) prepArgs.push('--dry-run');
if (max) prepArgs.push('--max', max);
if (append) prepArgs.push('--append');

const prep = spawnSync(process.execPath, prepArgs, {
  cwd: __dirname,
  stdio: 'inherit',
});

if (prep.status !== 0) {
  console.error('\n[batch104] pipeline-to-batch 失敗，中止。');
  process.exit(1);
}

if (dryRun) {
  console.log('\n[dry-run] 預覽完成，未執行評估。');
  process.exit(0);
}

// ── Step 2: batch-runner.sh ───────────────────────────────────────────────────

const bash = findBash();
if (!bash) {
  console.error('\n[batch104] 找不到 bash。');
  console.error('請安裝 Git for Windows 或在 Git Bash / WSL 中手動執行：');
  console.error('  ./batch/batch-runner.sh');
  process.exit(1);
}

const runnerPath = join(__dirname, 'batch', 'batch-runner.sh');
const runnerArgs = [runnerPath];
if (parallel) runnerArgs.push('--parallel', parallel);

console.log(`\n[batch104] 使用 bash: ${bash}`);
console.log('[batch104] 啟動 batch-runner.sh...\n');

const runner = spawnSync(bash, runnerArgs, {
  cwd: __dirname,
  stdio: 'inherit',
});

process.exit(runner.status ?? 0);
