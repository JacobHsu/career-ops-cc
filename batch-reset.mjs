/**
 * batch-reset.mjs — 清除批次暫存資料，讓 batch104 可以從頭重跑
 *
 * 清除項目：
 *   batch/batch-input.tsv   — 輸入清單
 *   batch/batch-state.tsv   — 執行狀態
 *   batch/jds/*.txt         — 預抓的 JD 文字
 *   batch/logs/*.log        — Worker 日誌
 *   batch/.resolved-prompt-* — 暫存 prompt 檔
 *
 * 不清除：
 *   reports/                — 評估報告（保留）
 *   batch/tracker-additions/ — Tracker TSV（保留，由 merge 負責）
 *   data/applications.md   — 主追蹤表（絕對保留）
 *
 * 使用方式：
 *   node batch-reset.mjs
 *   node batch-reset.mjs --dry-run   # 預覽，不刪除
 */

import { existsSync, readdirSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';

const dryRun = process.argv.includes('--dry-run');

function remove(filePath) {
  if (!existsSync(filePath)) return;
  if (dryRun) {
    console.log(`  [dry-run] 會刪除：${filePath}`);
    return;
  }
  try {
    rmSync(filePath, { recursive: false });
    console.log(`  ✓ 刪除：${filePath}`);
  } catch (e) {
    console.warn(`  ✗ 無法刪除 ${filePath}：${e.message}`);
  }
}

function removeGlob(dir, pattern) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter(f => pattern.test(f));
  for (const f of files) remove(join(dir, f));
}

console.log(`\nbatch-reset${dryRun ? ' [dry-run]' : ''}`);
console.log('─'.repeat(40));

remove('batch/batch-input.tsv');
remove('batch/batch-state.tsv');
removeGlob('batch/jds', /\.txt$/);
removeGlob('batch/logs', /\.log$/);
removeGlob('batch', /^\.resolved-prompt-/);

console.log(dryRun
  ? '\n[dry-run] 未刪除任何檔案。'
  : '\n✓ 批次暫存已清除。下次執行 npm run batch104 將從頭開始。');
