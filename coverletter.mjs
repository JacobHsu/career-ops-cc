#!/usr/bin/env node

/**
 * coverletter.mjs — 104 推薦信產生工具
 *
 * 給定職缺 URL，確認 cv.zh.md + jds/{jobNo}.md 存在後，
 * 透過 claude -p worker 產生繁中推薦信。
 * 若 jds/{jobNo}.md 不存在，自動先執行 fetch-jd.mjs。
 *
 * 使用方式：
 *   node coverletter.mjs https://www.104.com.tw/job/{jobNo}
 *   npm run coverletter -- https://www.104.com.tw/job/{jobNo}
 *
 * 輸出：output/coverletters/{jobNo}-{date}.md
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function extractJobNo(url) {
  const m = String(url).match(/104\.com\.tw\/job\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

// ── Parse args ────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg) {
  console.error('用法：');
  console.error('  npm run coverletter -- https://www.104.com.tw/job/{jobNo}');
  console.error('  npm run coverletter -- 8xxxxx');
  console.error('  npm run coverletter -- local:jds/8xxxxx.md');
  process.exit(1);
}

// 支援三種輸入格式
let jobNo;
if (arg.includes('104.com.tw/job/')) {
  jobNo = extractJobNo(arg);
} else if (arg.startsWith('local:jds/')) {
  jobNo = arg.replace('local:jds/', '').replace('.md', '');
} else if (/^[a-zA-Z0-9]+$/.test(arg)) {
  jobNo = arg;
} else {
  console.error(`[coverletter] 無法解析輸入：${arg}`);
  process.exit(1);
}

if (!jobNo) {
  console.error(`[coverletter] 無法提取 jobNo：${arg}`);
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════');
console.log('  coverletter — 推薦信產生器');
console.log('══════════════════════════════════════════════════\n');
console.log(`[coverletter] jobNo：${jobNo}\n`);

// ── Step 1: check cv.zh.md ────────────────────────────────────────────────────

const cvPath = join(__dirname, 'cv.zh.md');
if (!existsSync(cvPath)) {
  console.error('[coverletter] ❌ cv.zh.md 不存在。請先建立繁中 CV 再產生推薦信。');
  process.exit(1);
}
console.log('[coverletter] ✅ cv.zh.md 已確認');

// ── Step 2: check / fetch JD ──────────────────────────────────────────────────

const jdPath = join(__dirname, 'jds', `${jobNo}.md`);
if (!existsSync(jdPath)) {
  console.log(`[coverletter] jds/${jobNo}.md 不存在，先執行 fetch-jd...`);
  const fetch = spawnSync(process.execPath, ['fetch-jd.mjs', url], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  if (fetch.status !== 0 || !existsSync(jdPath)) {
    console.error(
      `[coverletter] ❌ fetch-jd 失敗，無法取得 JD。請手動執行：\n  npm run fetch104 -- ${url}`
    );
    process.exit(1);
  }
}
console.log(`[coverletter] ✅ jds/${jobNo}.md 已確認`);

// ── Step 3: check prompt file ─────────────────────────────────────────────────

const promptFile = join(__dirname, 'batch', 'coverletter-prompt.zh.md');
if (!existsSync(promptFile)) {
  console.error('[coverletter] ❌ batch/coverletter-prompt.zh.md 不存在。');
  process.exit(1);
}

// ── Step 4: ensure output dir ─────────────────────────────────────────────────

const outputDir = join(__dirname, 'output', 'coverletters');
mkdirSync(outputDir, { recursive: true });

const date = today();
const outputFile = join(outputDir, `${jobNo}-${date}.md`);
const relativeOutput = `output/coverletters/${jobNo}-${date}.md`;

// ── Step 5: run claude -p worker ──────────────────────────────────────────────

const workerInstructions = readFileSync(promptFile, 'utf-8');

const prompt =
  `${workerInstructions}\n\n` +
  `---\n\n` +
  `## 本次任務\n\n` +
  `不要問任何問題，直接執行：\n` +
  `1. 讀取 jds/${jobNo}.md（這是唯一要使用的 JD）\n` +
  `2. 讀取 cv.zh.md\n` +
  `3. 讀取 config/profile.yml\n` +
  `4. 讀取 modes/_profile.md\n` +
  `5. 依照上方指示產生繁體中文推薦信（四段，250–350 字，CAR 框架）\n` +
  `6. 自我檢查後將推薦信寫入 ${relativeOutput}\n` +
  `jobNo：${jobNo}，日期：${date}。完成後輸出「已寫入 ${relativeOutput}」。`;

console.log('\n[coverletter] 啟動 claude -p worker...\n');

const result = spawnSync(
  'claude',
  [
    '-p',
    '--allowedTools', 'Read,Write',
  ],
  {
    cwd: __dirname,
    input: prompt,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  }
);

if (result.error) {
  console.error(`\n[coverletter] ❌ 無法啟動 claude：${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`\n[coverletter] ❌ claude worker 失敗 (exit ${result.status}, signal ${result.signal})`);
  process.exit(result.status ?? 1);
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log('\n[coverletter] ✅ 完成');
if (existsSync(outputFile)) {
  console.log(`[coverletter] 推薦信位置：${relativeOutput}`);
} else {
  console.log('[coverletter] ⚠️  輸出檔案未找到，請確認 worker 是否有寫入檔案。');
}
