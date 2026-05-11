/**
 * pipeline-to-batch.mjs — pipeline.md → batch-input.tsv + JD 預抓
 *
 * 從 data/pipeline.md 讀取待處理職缺，輸出至 batch/batch-input.tsv，
 * 並從 104 API 預先抓取完整 JD 文字存至 batch/jds/{id}.txt，
 * 供 batch-runner.sh worker 直接讀檔（不需 Playwright，不會 402）。
 *
 * 使用方式：
 *   node pipeline-to-batch.mjs                # 全部 pending 項目
 *   node pipeline-to-batch.mjs --max 20       # 只取前 20 筆
 *   node pipeline-to-batch.mjs --append       # 附加（不覆蓋現有 TSV）
 *   node pipeline-to-batch.mjs --dry-run      # 預覽，不寫入檔案
 *   node pipeline-to-batch.mjs --skip-jd      # 略過 JD 抓取
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const PIPELINE_PATH = 'data/pipeline.md';
const BATCH_INPUT_PATH = 'batch/batch-input.tsv';
const BATCH_STATE_PATH = 'batch/batch-state.tsv';
const JD_DIR = 'batch/jds';

const HEADERS_104 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.104.com.tw/',
};

// ── Readers ───────────────────────────────────────────────────────────────────

function readPipelinePending() {
  if (!existsSync(PIPELINE_PATH)) return [];
  const text = readFileSync(PIPELINE_PATH, 'utf-8');
  const items = [];
  for (const m of text.matchAll(/^- \[ \] (https?:\/\/\S+)\s*\|\s*([^|]+)\|/gm)) {
    items.push({ url: m[1].trim(), company: m[2].trim() });
  }
  return items;
}

function readCompletedUrls() {
  if (!existsSync(BATCH_STATE_PATH)) return new Set();
  const text = readFileSync(BATCH_STATE_PATH, 'utf-8');
  const done = new Set();
  for (const line of text.split('\n').slice(1)) {
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    if (cols[2].trim() === 'completed') done.add(cols[1].trim());
  }
  return done;
}

function readExistingInputUrls() {
  if (!existsSync(BATCH_INPUT_PATH)) return new Set();
  const text = readFileSync(BATCH_INPUT_PATH, 'utf-8');
  const seen = new Set();
  for (const line of text.split('\n').slice(1)) {
    const cols = line.split('\t');
    if (cols.length >= 2) seen.add(cols[1].trim());
  }
  return seen;
}

function nextStartId(append) {
  let max = 0;

  // Read max ID from existing batch-input.tsv (only when appending)
  if (append && existsSync(BATCH_INPUT_PATH)) {
    for (const line of readFileSync(BATCH_INPUT_PATH, 'utf-8').split('\n').slice(1)) {
      const id = parseInt(line.split('\t')[0], 10);
      if (!isNaN(id) && id > max) max = id;
    }
  }

  // Always read max ID from batch-state.tsv to avoid ID collisions with past runs
  if (existsSync(BATCH_STATE_PATH)) {
    for (const line of readFileSync(BATCH_STATE_PATH, 'utf-8').split('\n').slice(1)) {
      const id = parseInt(line.split('\t')[0], 10);
      if (!isNaN(id) && id > max) max = id;
    }
  }

  return max + 1;
}

// ── 104 JD Fetcher ────────────────────────────────────────────────────────────

function extractJobNo(url) {
  const m = url.match(/104\.com\.tw\/job\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

async function fetch104Jd(jobNo, company) {
  const apiUrl = `https://www.104.com.tw/job/ajax/content/${jobNo}`;
  try {
    const res = await fetch(apiUrl, { headers: { ...HEADERS_104, 'Referer': `https://www.104.com.tw/job/${jobNo}` } });
    if (!res.ok) return null;
    const d = await res.json();
    const h = d?.data?.header || {};
    const jd = d?.data?.jobDetail || {};
    const cond = d?.data?.condition || {};
    const welfare = d?.data?.welfare || {};

    const str = v => (typeof v === 'object' && v !== null) ? (v.description || v.name || JSON.stringify(v)) : String(v ?? '');
    const skills = (cond.skill || []).map(s => str(s.description || s)).filter(Boolean);
    const certs = (cond.certificate || []).map(c => str(c.description || c)).filter(Boolean);
    const langs = (cond.language || []).map(l => {
      const lang = str(l.language);
      const ability = str(l.ability);
      return [lang, ability].filter(Boolean).join(' ');
    }).filter(Boolean);

    const JOB_TYPE = { 1: '全職', 2: '兼職', 3: '高階', 4: '派遣', 5: '實習' };
    const jobTypeLabel = JOB_TYPE[jd.jobType] || str(jd.jobType) || '';

    return [
      `# 職缺 JD — ${h.jobName || company}`,
      `公司：${h.corpName || company}`,
      `URL：https://www.104.com.tw/job/${jobNo}`,
      `薪資：${jd.salary || '面議'}`,
      `工作地點：${jd.addressRegion || ''}${jd.addressArea || ''}`,
      `工作性質：${jobTypeLabel}`,
      `遠端：${jd.remoteWork ? '是' : '否'}`,
      '',
      '## 工作內容',
      jd.jobDescription || '（無）',
      '',
      '## 條件要求',
      `年資：${cond.workExp || '不拘'}`,
      `學歷：${cond.edu || '不拘'}`,
      skills.length ? `技能：${skills.join('、')}` : '',
      certs.length ? `證照：${certs.join('、')}` : '',
      langs.length ? `語言：${langs.join('、')}` : '',
      cond.other ? `其他：${cond.other}` : '',
      '',
      '## 福利待遇',
      welfare.welfare || '',
      welfare.tag?.length ? `標籤：${welfare.tag.join('、')}` : '',
    ].filter(l => l !== null).join('\n').trim();
  } catch {
    return null;
  }
}

function jdPath(id) {
  return join(JD_DIR, `${id}.txt`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const append = args.includes('--append');
  const skipJd = args.includes('--skip-jd');
  const maxIdx = args.indexOf('--max');
  const maxItems = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) : Infinity;

  const pending = readPipelinePending();
  const completed = readCompletedUrls();
  const existingUrls = append ? readExistingInputUrls() : new Set();

  const filtered = pending.filter(
    ({ url }) => !completed.has(url) && !existingUrls.has(url)
  );
  const selected = isFinite(maxItems) ? filtered.slice(0, maxItems) : filtered;

  console.log(`\npipeline → batch-input`);
  console.log(`pipeline.md pending：${pending.length} 筆`);
  console.log(`已完成（batch-state）：${completed.size} 筆`);
  console.log(`將寫入：${selected.length} 筆${isFinite(maxItems) ? `（限制 ${maxItems}）` : ''}`);
  console.log('─'.repeat(48));

  if (selected.length === 0) {
    console.log('無新職缺可加入，結束。');
    return;
  }

  selected.forEach((item, i) => {
    const displayId = (append ? nextStartId(true) - 1 : 0) + i + 1;
    console.log(`  ${String(displayId).padStart(3)}  ${item.company.slice(0, 30).padEnd(30)}  ${item.url}`);
  });

  if (dryRun) {
    console.log('\n[dry-run] 未寫入任何檔案。');
    return;
  }

  mkdirSync(JD_DIR, { recursive: true });

  const startId = nextStartId(append);

  // Fetch JDs and build TSV rows
  const newRows = [];
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i];
    const id = startId + i;
    const jdFile = jdPath(id);

    if (!skipJd) {
      const jobNo = extractJobNo(item.url);
      process.stdout.write(`  抓取 JD [${i + 1}/${selected.length}] ${item.company.slice(0, 25)} → `);
      if (jobNo) {
        const jdText = await fetch104Jd(jobNo, item.company);
        if (jdText) {
          writeFileSync(jdFile, jdText, 'utf-8');
          process.stdout.write(`✓ (${jdText.length} 字)\n`);
        } else {
          process.stdout.write(`✗ API 失敗，worker 將自行 fetch\n`);
        }
      } else {
        process.stdout.write(`✗ 非 104 URL，略過\n`);
      }
    }

    newRows.push(`${id}\t${item.url}\t104\t${jdFile}`);
  }

  // Write batch-input.tsv (notes column = jd file path)
  const header = 'id\turl\tsource\tnotes';
  if (append && existsSync(BATCH_INPUT_PATH)) {
    const existing = readFileSync(BATCH_INPUT_PATH, 'utf-8').trimEnd();
    writeFileSync(BATCH_INPUT_PATH, existing + '\n' + newRows.join('\n') + '\n', 'utf-8');
  } else {
    writeFileSync(BATCH_INPUT_PATH, header + '\n' + newRows.join('\n') + '\n', 'utf-8');
  }

  console.log(`\n✓ JD 已存至 ${JD_DIR}/`);
  console.log(`✓ 已寫入 ${BATCH_INPUT_PATH}（${selected.length} 筆）`);
  console.log(`下一步：./batch/batch-runner.sh --dry-run`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
