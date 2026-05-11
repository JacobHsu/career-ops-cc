/**
 * goodjob.mjs — GoodJob 面試情報抓取工具
 *
 * 從 goodjob.life 批次抓取 pipeline.md 中各公司的面試心得與薪資概況，
 * 輸出到 interview-prep/goodjob-{slug}.md。
 *
 * 使用方式：
 *   node goodjob.mjs                      # 從 pipeline.md pending 批次
 *   node goodjob.mjs --company "xxx" # 單公司
 *   node goodjob.mjs --force              # 強制重抓（忽略快取）
 *   node goodjob.mjs --dry-run            # 只列出公司，不抓取
 *   node goodjob.mjs --max-age-days 60    # 自訂快取天數（預設 30）
 *
 * 注意：goodjob.life 內容為使用者匿名分享，僅供個人求職參考，請勿大量轉載。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://www.goodjob.life';
const PIPELINE_PATH = 'data/pipeline.md';
const OUTPUT_DIR = 'interview-prep/goodjob';
const DEFAULT_MAX_AGE_DAYS = 30;
const MAX_EXPERIENCES = 3;
const SLEEP_MIN = 1500;
const SLEEP_MAX = 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Encoding': 'identity',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep() {
  const ms = SLEEP_MIN + Math.random() * (SLEEP_MAX - SLEEP_MIN);
  return new Promise(r => setTimeout(r, ms));
}

function fileSlug(name) {
  return name.replace(/[\s\/\\:*?"<>|]/g, '-').replace(/-+/g, '-').slice(0, 60);
}

function outputPath(name) {
  return join(OUTPUT_DIR, `goodjob-${fileSlug(name)}.md`);
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function loadCache(companyName) {
  const path = outputPath(companyName);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  const m = content.match(/^> 抓取: (\d{4}-\d{2}-\d{2})/m);
  return { content, fetchedAt: m ? new Date(m[1]) : null };
}

function isCacheFresh(cache, maxAgeDays) {
  if (!cache?.fetchedAt) return false;
  return (Date.now() - cache.fetchedAt.getTime()) < maxAgeDays * 86400000;
}

function writeCache(companyName, markdown) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(outputPath(companyName), markdown, 'utf-8');
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// ── Data Extraction ───────────────────────────────────────────────────────────

function parseWindowData(html) {
  const m = html.match(/window\.__data\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return {};
  try {
    return JSON.parse(m[1].replace(/:\s*undefined/g, ': null'));
  } catch { return {}; }
}

// ── Company Slug Resolution ───────────────────────────────────────────────────

async function findSlug(companyName) {
  // Tier 1: Try direct URL with company name (goodjob uses URL-encoded Chinese names)
  const directUrl = `${BASE_URL}/companies/${encodeURIComponent(companyName)}/interview-experiences`;
  try {
    const res = await fetch(directUrl, { method: 'HEAD', headers: HEADERS });
    if (res.ok) return companyName;
  } catch { /* continue */ }

  // Tier 2: Search via /companies?q= and parse indexesByPage
  try {
    await sleep();
    const html = await fetchHtml(`${BASE_URL}/companies?q=${encodeURIComponent(companyName)}`);
    const data = parseWindowData(html);
    const pages = data?.companyIndex?.indexesByPage ?? {};
    for (const items of Object.values(pages)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (typeof item?.name === 'string' && item.name.includes(companyName.slice(0, 4))) {
          return item.name;
        }
      }
    }
  } catch { /* continue */ }

  return null;
}

// ── Fetch Experience IDs from paginated HTML ──────────────────────────────────

async function fetchExpIds(slug, maxIds = 30) {
  const seen = new Set();
  const base = `${BASE_URL}/companies/${encodeURIComponent(slug)}/interview-experiences`;

  for (let start = 0; start < maxIds; start += 10) {
    const url = `${base}?start=${start}&limit=10`;
    try {
      const html = await fetchHtml(url);
      const ids = [...html.matchAll(/\/experiences\/([a-f0-9]{24})/g)].map(m => m[1]);
      const newIds = ids.filter(id => !seen.has(id));
      if (newIds.length === 0) break;
      newIds.forEach(id => seen.add(id));
      if (start + 10 < maxIds) await sleep();
    } catch { break; }
  }

  return [...seen];
}

// ── Fetch Single Experience ───────────────────────────────────────────────────

async function fetchExperience(expId) {
  const url = `${BASE_URL}/experiences/${expId}`;
  const html = await fetchHtml(url);
  const data = parseWindowData(html);
  const raw = data?.experience?.experienceById?.[expId]?.data;
  if (!raw) return null;

  return {
    company: raw.originalCompanyName || '',
    jobTitle: raw.job_title?.name || '',
    region: raw.region || '',
    expYears: raw.experience_in_year ?? null,
    year: raw.interview_time?.year || 0,
    month: raw.interview_time?.month || 0,
    result: raw.interview_result || '',
    rating: raw.averageSectionRating ?? null,
    sections: (raw.sections || []).map(s => ({ subtitle: s.subtitle || '', content: s.content || '' })),
    url,
  };
}

// ── Fetch Salary Overview ─────────────────────────────────────────────────────

async function fetchSalary(slug) {
  try {
    const html = await fetchHtml(`${BASE_URL}/companies/${encodeURIComponent(slug)}`);
    const data = parseWindowData(html);
    const stats = data?.companyIndex?.overviewStatisticsByName ?? {};
    const first = Object.values(stats)[0]?.data;
    return (first?.jobAverageSalaries || []).map(s => ({
      job: s.job_title?.name || '',
      type: s.average_salary?.type || '',
      amount: s.average_salary?.amount || 0,
      count: s.data_count || 0,
    }));
  } catch { return []; }
}

// ── Markdown Renderer ─────────────────────────────────────────────────────────

function renderSalary(salaries) {
  if (!salaries.length) return '（無薪資資料）';
  const header = '| 職務 | 類型 | 金額 | 樣本數 |\n|------|------|------|--------|';
  const rows = salaries.slice(0, 8).map(s => {
    const type = s.type === 'month' ? '月薪' : '年薪';
    return `| ${s.job} | ${type} | ${s.amount.toLocaleString()} | ${s.count} |`;
  });
  return header + '\n' + rows.join('\n');
}

function renderExp(exp, idx) {
  const date = `${exp.year}/${String(exp.month).padStart(2, '0')}`;
  const rating = exp.rating != null ? `${exp.rating}/5` : '未填';
  const expYr = exp.expYears != null ? `${exp.expYears} 年` : '未填';
  const sections = exp.sections.map(s => `\n**【${s.subtitle}】**\n${s.content}`).join('\n');
  return `### ${idx}. ${exp.jobTitle || '不明職務'} — ${date} — ${exp.region}

- **結果：** ${exp.result || '未填'}
- **評分：** ${rating}
- **年資：** ${expYr}
- **連結：** ${exp.url}
${sections}`;
}

function renderMarkdown(companyName, slug, interviews, salaries, interviewCount) {
  const today = new Date().toISOString().slice(0, 10);
  const sourceUrl = `${BASE_URL}/companies/${encodeURIComponent(slug)}/interview-experiences`;
  const countNote = interviewCount > 0 ? `面試篇數：${interviewCount} 篇` : '';

  const interviewSection = interviews.length > 0
    ? interviews.map((e, i) => renderExp(e, i + 1)).join('\n\n---\n\n')
    : '（尚無符合條件的面試心得）';

  return `# GoodJob 面試報告 — ${companyName}

> 來源: ${sourceUrl}
> 抓取: ${today} | Slug: ${slug}${countNote ? ' | ' + countNote : ''}
> 內容為 goodjob.life 使用者匿名分享，僅供個人求職參考。

## 薪資概況

${renderSalary(salaries)}

## 面試心得（最近 3 年，最多 ${MAX_EXPERIENCES} 筆）

${interviewSection}
`;
}

// ── Main Process ──────────────────────────────────────────────────────────────

async function processCompany(companyName, { force, maxAgeDays }) {
  process.stdout.write(`  ${companyName} → `);

  if (!force) {
    const cache = loadCache(companyName);
    if (isCacheFresh(cache, maxAgeDays)) {
      console.log('快取有效，跳過');
      return 'cached';
    }
  }

  // Resolve slug
  const slug = await findSlug(companyName);
  if (!slug) {
    console.log('無法解析，略過');
    return 'unresolved';
  }
  process.stdout.write(`${slug === companyName ? '直接命中' : `搜尋找到: ${slug}`} → `);

  try {
    // Fetch interview count + exp IDs
    await sleep();
    const intHtml = await fetchHtml(`${BASE_URL}/companies/${encodeURIComponent(slug)}/interview-experiences`);
    const countMatch = intHtml.match(/共\s*(\d+)\s*篇/);
    const interviewCount = countMatch ? parseInt(countMatch[1]) : 0;

    const expIds = await fetchExpIds(slug, MAX_EXPERIENCES * 10);
    process.stdout.write(`${expIds.length} 篇 → `);

    // Fetch individual experiences (filter last 3 years)
    const minYear = new Date().getFullYear() - 2;
    const interviews = [];
    for (const id of expIds) {
      if (interviews.length >= MAX_EXPERIENCES) break;
      await sleep();
      const exp = await fetchExperience(id);
      if (!exp) continue;
      if (exp.year && exp.year < minYear) continue;
      interviews.push(exp);
    }

    // Fetch salary
    await sleep();
    const salaries = await fetchSalary(slug);

    const markdown = renderMarkdown(companyName, slug, interviews, salaries, interviewCount);
    writeCache(companyName, markdown);
    console.log(`完成（${interviews.length} 筆心得）`);
    return 'fetched';
  } catch (err) {
    console.log(`失敗 (${err.message})`);
    return 'error';
  }
}

// ── Pipeline Reader ───────────────────────────────────────────────────────────

function readPipelineCompanies() {
  if (!existsSync(PIPELINE_PATH)) return [];
  const text = readFileSync(PIPELINE_PATH, 'utf-8');
  const seen = new Set();
  for (const m of text.matchAll(/^- \[ \] https?:\/\/\S+\s*\|\s*([^|]+)\|/gm)) {
    const name = m[1].trim();
    if (name) seen.add(name);
  }
  return [...seen];
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const maxAgeDaysIdx = args.indexOf('--max-age-days');
  const maxAgeDays = maxAgeDaysIdx !== -1 ? parseInt(args[maxAgeDaysIdx + 1], 10) : DEFAULT_MAX_AGE_DAYS;
  const companyIdx = args.indexOf('--company');
  const singleCompany = companyIdx !== -1 ? args[companyIdx + 1] : null;

  const date = new Date().toLocaleDateString('zh-TW');
  console.log(`\nGoodJob 面試情報抓取 — ${date}`);
  console.log(`快取有效期：${maxAgeDays} 天 | 強制重抓：${force}`);
  console.log('='.repeat(56));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const companies = singleCompany ? [singleCompany] : readPipelineCompanies();
  if (companies.length === 0) {
    console.log('pipeline.md 中無 pending 職缺。');
    return;
  }

  console.log(`共 ${companies.length} 間公司（去重後）\n`);

  if (dryRun) {
    companies.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    return;
  }

  const counters = { fetched: 0, cached: 0, unresolved: 0, error: 0 };
  for (const company of companies) {
    const result = await processCompany(company, { force, maxAgeDays });
    counters[result] = (counters[result] || 0) + 1;
  }

  console.log(`\n${'='.repeat(56)}`);
  console.log(`已抓取：${counters.fetched} | 快取：${counters.cached} | 無法解析：${counters.unresolved} | 失敗：${counters.error}`);
  console.log(`報告輸出至：${OUTPUT_DIR}/goodjob-*.md`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
