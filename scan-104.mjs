#!/usr/bin/env node

/**
 * Zero-token 104.com.tw scanner.
 *
 * Uses the 104 search API directly — no Playwright, no WebSearch tokens.
 * Reads keywords and filters from portals.yml.
 * Writes new offers to data/pipeline.md and data/scan-history.tsv.
 *
 * Usage:
 *   node scan-104.mjs
 *   node scan-104.mjs --dry-run
 *   node scan-104.mjs --max-pages 3
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';

const configArg = process.argv.find(a => a.startsWith('--config='));
const PORTALS_PATH = configArg ? configArg.split('=')[1] : (process.env.PORTALS_FILE || 'portals.yml');
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const SCAN_HISTORY_MD_PATH = 'data/scan-history.md';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

const API_URL = 'https://www.104.com.tw/jobs/search/api/jobs';
const REFERER = 'https://www.104.com.tw/jobs/search/';
const DEFAULT_MAX_PAGES = 5;
const FETCH_TIMEOUT_MS = 20_000;
const MIN_SLEEP_MS = 1500;
const MAX_SLEEP_MS = 3500;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomSleep() {
  const ms = MIN_SLEEP_MS + Math.random() * (MAX_SLEEP_MS - MIN_SLEEP_MS);
  return sleep(ms);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function parseYamlFile(path) {
  return yaml.load(readFileSync(path, 'utf-8'));
}

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(normalizeKey).filter(Boolean);
  const negative = (titleFilter?.negative || []).map(normalizeKey).filter(Boolean);
  return (title) => {
    const lower = normalizeKey(title);
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

function buildFilter104(f = {}) {
  const allowedLocs = (f.allowed_locations || []).map(normalizeKey).filter(Boolean);
  const excludedLocs = (f.excluded_locations || []).map(normalizeKey).filter(Boolean);
  const excludeCompanies = (f.exclude_companies || []).map(normalizeKey).filter(Boolean);
  const minSalary = f.min_salary_annual || 0;
  const minMonthlyMax = f.min_monthly_salary_max || 0;
  const acceptNegotiable = f.accept_negotiable !== false;
  const maxAgeDays = f.max_age_days || 0;
  const includeRemote = f.include_remote !== false;

  const cutoffDate = maxAgeDays > 0
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - maxAgeDays);
        return d.toISOString().slice(0, 10).replace(/-/g, '');
      })()
    : null;

  return (job) => {
    const isRemote = job.remoteWorkType > 0;

    // Remote jobs bypass location filter if include_remote is true
    if (isRemote && includeRemote) {
      // still apply excluded_locations for explicitly blacklisted areas
    } else if (allowedLocs.length > 0) {
      const loc = normalizeKey(job.location);
      if (!allowedLocs.some(a => loc.includes(a))) return { pass: false, reason: 'location' };
    }

    if (excludedLocs.length > 0) {
      const loc = normalizeKey(job.location);
      if (excludedLocs.some(e => loc.includes(e))) return { pass: false, reason: 'location_excluded' };
    }

    // Company exclusion
    if (excludeCompanies.length > 0) {
      const co = normalizeKey(job.company);
      if (excludeCompanies.some(e => co.includes(e))) return { pass: false, reason: 'company_excluded' };
    }

    // Salary filter
    if (minSalary > 0) {
      if (!acceptNegotiable && job.salary === '面議') return { pass: false, reason: 'salary' };
      if (job.salary !== '面議' && acceptNegotiable === false) {
        // parse salary
        const annualMatch = job.salary.match(/(\d[\d,]+)/);
        if (annualMatch) {
          const val = parseInt(annualMatch[1].replace(/,/g, ''), 10);
          // monthly salary heuristic: if < 200000 assume monthly, multiply by 12
          const annual = val < 200000 ? val * 12 : val;
          if (annual < minSalary) return { pass: false, reason: 'salary' };
        }
      }
    }

    // Monthly salary upper bound filter
    if (minMonthlyMax > 0 && job.salary && job.salary !== '面議') {
      const parts = job.salary.replace(/,/g, '').match(/(\d+)(?:~(\d+))?/);
      if (parts) {
        const hi = parseInt(parts[2] || parts[1], 10);
        // treat as monthly if upper bound < 200,000
        if (hi < 200000 && hi < minMonthlyMax) return { pass: false, reason: 'salary_max_too_low' };
      }
    }

    // Age filter
    if (cutoffDate && job.appearDate) {
      const dateStr = String(job.appearDate).replace(/-/g, '').slice(0, 8);
      if (dateStr && dateStr < cutoffDate) return { pass: false, reason: 'too_old' };
    }

    return { pass: true };
  };
}

function extract104Keywords(searchQueries) {
  const keywords = new Set();
  for (const q of searchQueries) {
    if (!q.enabled) continue;
    if (!q.query || !q.query.includes('104.com.tw')) continue;
    for (const m of String(q.query).matchAll(/"([^"]+)"/g)) {
      const term = m[1].trim();
      if (!term.toLowerCase().startsWith('site:') && term.length > 1) {
        keywords.add(term);
      }
    }
  }
  return [...keywords];
}

const REMOTE_LABEL = { 0: '', 1: '混合遠端', 2: '完全遠端' };

const EDU_LABEL = { 1: '高中', 2: '專科', 3: '大學', 4: '碩士', 5: '博士', 6: '不拘' };

function formatSalary(raw) {
  const desc = normalizeText(raw.salaryDesc);
  if (desc) return desc;
  const low = raw.salaryLow || 0;
  const high = raw.salaryHigh || 0;
  if (low && high) return `${low.toLocaleString()}~${high.toLocaleString()}`;
  if (low) return `${low.toLocaleString()} 以上`;
  return '面議';
}

function formatDate(raw) {
  const s = String(raw || '');
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function formatEmployeeCount(count) {
  if (!count) return '';
  if (count < 30) return `<30人`;
  if (count < 100) return `${count}人`;
  if (count < 500) return `${Math.round(count / 100) * 100}人以上`;
  return `${Math.round(count / 500) * 500}人以上`;
}

function parseJob(raw) {
  const link = raw.link || {};
  const jobUrl = link.job || '';
  const jobNo = String(raw.jobNo || raw.jobno || '');
  const url = jobUrl.startsWith('http')
    ? jobUrl.split('?')[0]
    : jobNo
    ? `https://www.104.com.tw/job/${jobNo}`
    : '';
  if (!url || !jobNo) return null;

  const skills = (raw.pcSkills || []).map(s => s.description).filter(Boolean);
  const edu = (raw.optionEdu || []).map(e => EDU_LABEL[e]).filter(Boolean);
  const remoteType = raw.remoteWorkType || 0;

  return {
    jobNo,
    title: normalizeText(raw.jobName || raw.name),
    company: normalizeText(raw.custName || raw.companyName),
    location: normalizeText(raw.jobAddrNoDesc || raw.location),
    salary: formatSalary(raw),
    appearDate: formatDate(raw.appearDate),
    remoteWorkType: remoteType,
    remoteLabel: REMOTE_LABEL[remoteType] || '',
    industry: normalizeText(raw.coIndustryDesc),
    skills,
    edu,
    employeeCount: formatEmployeeCount(raw.employeeCount),
    applyCnt: raw.applyCnt || 0,
    url,
  };
}

async function fetchPage(keyword, page, areas, jobcats) {
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    ro: '0',
    order: '15',
    asc: '0',
    mode: 's',
  });
  if (areas && areas.length > 0) {
    params.set('area', areas.join(','));
  }
  if (jobcats && jobcats.length > 0) {
    params.set('jobcat', jobcats.join(','));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUserAgent(),
        Referer: REFERER,
        Accept: 'application/json, text/plain, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data || [];
    const pagination = json.metadata?.pagination || {};
    const lastPage = pagination.lastPage || 1;
    return { jobs: Array.isArray(data) ? data : [], lastPage };
  } finally {
    clearTimeout(timer);
  }
}

async function scan104Keyword(keyword, maxPages, areas, jobcats) {
  const results = [];
  const seenNos = new Set();
  let lastPage = 1;

  for (let page = 1; page <= Math.min(maxPages, lastPage === 1 && page === 1 ? 999 : lastPage); page++) {
    process.stdout.write(`  "${keyword}" page=${page}/${lastPage === 1 ? '?' : lastPage} ... `);
    try {
      const data = await fetchPage(keyword, page, areas, jobcats);
      lastPage = data.lastPage;
      process.stdout.write(`${data.jobs.length} jobs\n`);

      for (const raw of data.jobs) {
        const job = parseJob(raw);
        if (job && !seenNos.has(job.jobNo)) {
          seenNos.add(job.jobNo);
          results.push(job);
        }
      }

      if (page >= lastPage || page >= maxPages) break;
      await randomSleep();
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      break;
    }
  }

  return results;
}

function loadSeenUrls() {
  const seen = new Set();

  if (existsSync(SCAN_HISTORY_PATH)) {
    for (const line of readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n').slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    for (const m of readFileSync(PIPELINE_PATH, 'utf-8').matchAll(/- \[[ x!]\] (https?:\/\/\S+)/g)) {
      seen.add(m[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    for (const m of readFileSync(APPLICATIONS_PATH, 'utf-8').matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(m[0]);
    }
  }

  return seen;
}

function ensurePipelineFile() {
  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(PIPELINE_PATH, '# Job Pipeline\n\n## Pending\n\n## Processed\n', 'utf-8');
  }
}

function appendToPipeline(offers) {
  ensurePipelineFile();
  rebuildPipelinePending(offers);
}

function rebuildPipelinePending(newOffers = []) {
  ensurePipelineFile();
  const text = readFileSync(PIPELINE_PATH, 'utf-8');

  // Extract existing pending items (url → { line, location, date })
  const existingMap = new Map();
  for (const m of text.matchAll(/^- \[ \] (https?:\/\/\S+)[^\n]*/gm)) {
    const line = m[0];
    const url = m[1];
    const parts = line.split(' | ');
    const location = parts[3] || '';
    const date = parts[4] ? parts[4].trim() : '';
    existingMap.set(url, { line, location, date });
  }

  // Merge new offers (overwrite if already present)
  for (const o of newOffers) {
    const remote = o.remoteLabel ? ` [${o.remoteLabel}]` : '';
    const loc = o.location || '';
    const date = o.appearDate || '';
    const line = `- [ ] ${o.url} | ${o.company} | ${o.title}${remote} | ${loc} | ${date}`;
    existingMap.set(o.url, { line, location: loc, date });
  }

  // Group by location, sort within group by date desc
  const groups = new Map();
  for (const { line, location, date } of existingMap.values()) {
    const group = location || '其他';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ line, date });
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    const order = ['台北市', '新北市'];
    const ai = order.findIndex(p => a.startsWith(p));
    const bi = order.findIndex(p => b.startsWith(p));
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });
  for (const [, items] of sortedGroups) {
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const pendingBlock = sortedGroups.map(([group, items]) =>
    `### ${group}\n\n` + items.map(i => i.line).join('\n')
  ).join('\n\n');

  // Preserve Processed section
  const processedMatch = text.match(/\n## Processed[\s\S]*/);
  const processedSection = processedMatch ? processedMatch[0] : '\n\n## Processed\n';

  const total = existingMap.size;
  writeFileSync(PIPELINE_PATH,
    `# Job Pipeline\n\n共 ${total} 筆待評估\n\n## Pending\n\n${pendingBlock}${processedSection}`,
    'utf-8'
  );
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tappear_date\tportal\ttitle\tcompany\tlocation\tremote\tsalary\tindustry\tstatus\tfirst_seen\n', 'utf-8');
  }
  const lines = offers.map(o => [
    o.url,
    o.appearDate,
    '104',
    o.title,
    o.company,
    o.location,
    o.remoteLabel || '',
    o.salary,
    o.industry,
    'added',
    date,
  ].join('\t')).join('\n') + '\n';
  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
  rebuildScanHistoryMd();
}

function rebuildScanHistoryMd() {
  if (!existsSync(SCAN_HISTORY_PATH)) return;
  const rows = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n').slice(1).filter(l => l.trim())
    .sort((a, b) => (b.split('\t')[1] || '').localeCompare(a.split('\t')[1] || ''));
  const date = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // group by district (e.g. "台北市信義區" → "台北市信義區", fallback to city)
  const groups = new Map();
  for (const line of rows) {
    const [url, appear_date, , title, company, location, remote, salary] = line.split('\t');
    const group = location || '其他';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ url, appear_date, title, company, location, remote, salary });
  }
  // sort groups: 台北市 first, then 新北市, then others alphabetically
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    const order = ['台北市', '新北市'];
    const ai = order.findIndex(p => a.startsWith(p));
    const bi = order.findIndex(p => b.startsWith(p));
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });

  const tableHeader = `| 刊登日 | 公司 | 職務 | 薪水 | 遠端 | 連結 |\n|--------|------|------|------|------|------|`;
  const sections = sortedGroups.map(([group, items]) => {
    const tableRows = items.map(({ url, appear_date, title, company, remote, salary }) => {
      const shortDate = appear_date ? appear_date.slice(5).replace('-', '/') : '';
      return `| ${shortDate} | ${company} | ${title} | ${salary} | ${remote} | [104](${url}) |`;
    }).join('\n');
    return `## ${group}（${items.length} 筆）\n\n${tableHeader}\n${tableRows}`;
  }).join('\n\n');

  const content = `# Scan History — ${date}\n\n共 ${rows.length} 筆\n\n${sections}\n`;
  writeFileSync(SCAN_HISTORY_MD_PATH, content, 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxPagesIdx = args.indexOf('--max-pages');
  const maxPages = maxPagesIdx !== -1 ? parseInt(args[maxPagesIdx + 1], 10) : DEFAULT_MAX_PAGES;
  const showSampleIdx = args.indexOf('--show-sample');
  const showSample = showSampleIdx !== -1 ? parseInt(args[showSampleIdx + 1], 10) : (dryRun ? 10 : 0);

  if (!existsSync(PORTALS_PATH)) {
    console.error(`Error: ${PORTALS_PATH} not found.`);
    process.exit(1);
  }

  const config = parseYamlFile(PORTALS_PATH);
  const titleFilter = buildTitleFilter(config.title_filter);
  const filter104 = buildFilter104(config.filter_104 || {});
  const keywords = extract104Keywords(config.search_queries || []);
  const areas = config.filter_104?.areas || [];
  const jobcats = config.filter_104?.jobcats || [];

  if (keywords.length === 0) {
    console.error(`No enabled 104 search_queries found in ${PORTALS_PATH}.`);
    process.exit(1);
  }

  const seenUrls = loadSeenUrls();
  const date = new Date().toISOString().slice(0, 10);
  const f = config.filter_104 || {};

  console.log(`\n104 Scanner -- ${date}`);
  console.log(`Keywords: ${keywords.join(', ')}`);
  console.log(`Areas: ${areas.length > 0 ? areas.join(', ') : '全台'}`);
  console.log(`Max pages: ${maxPages} | Max age: ${f.max_age_days || '不限'}天 | Min salary: ${f.min_salary_annual ? `${f.min_salary_annual.toLocaleString()}` : '不限'}`);
  console.log(`Allowed locations: ${(f.allowed_locations || []).join(', ') || '不限'}`);
  console.log('='.repeat(56));

  const counters = { found: 0, titleFiltered: 0, locationFiltered: 0, companyFiltered: 0, ageFiltered: 0, salaryFiltered: 0, duplicates: 0 };
  const newOffers = [];
  const sampleOffers = [];  // passes all filters, including dupes — for dry-run preview
  const seenNos = new Set();

  for (const keyword of keywords) {
    console.log(`\nKeyword: "${keyword}"`);
    const jobs = await scan104Keyword(keyword, maxPages, areas, jobcats);
    counters.found += jobs.length;

    for (const job of jobs) {
      if (seenNos.has(job.jobNo)) { counters.duplicates++; continue; }

      if (!titleFilter(job.title)) { counters.titleFiltered++; continue; }

      const { pass, reason } = filter104(job);
      if (!pass) {
        if (reason === 'location' || reason === 'location_excluded') counters.locationFiltered++;
        else if (reason === 'company_excluded') counters.companyFiltered++;
        else if (reason === 'too_old') counters.ageFiltered++;
        else if (reason === 'salary_max_too_low') counters.salaryFiltered++;
        continue;
      }

      seenNos.add(job.jobNo);

      if (dryRun && sampleOffers.length < showSample) sampleOffers.push(job);

      if (seenUrls.has(job.url)) { counters.duplicates++; continue; }

      seenUrls.add(job.url);
      newOffers.push(job);
    }

    if (keywords.indexOf(keyword) < keywords.length - 1) {
      await randomSleep();
    }
  }

  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  console.log(`\n${'='.repeat(56)}`);
  console.log(`Total fetched:         ${counters.found}`);
  console.log(`Title filtered:        ${counters.titleFiltered}`);
  console.log(`Location filtered:     ${counters.locationFiltered}`);
  console.log(`Company filtered:      ${counters.companyFiltered}`);
  console.log(`Too old (>${f.max_age_days || 0}d):      ${counters.ageFiltered}`);
  console.log(`Salary max too low:    ${counters.salaryFiltered}`);
  console.log(`Duplicates skipped:    ${counters.duplicates}`);
  console.log(`New offers added:      ${newOffers.length}${dryRun ? ' (dry run)' : ''}`);

  function printOffer(o) {
    const remote = o.remoteLabel ? ` [${o.remoteLabel}]` : '';
    const skills = o.skills.length > 0 ? ` #${o.skills.join(' #')}` : '';
    const size = o.employeeCount ? ` | ${o.employeeCount}` : '';
    console.log(`  + ${o.company} | ${o.title}`);
    console.log(`    ${o.location}${remote} | ${o.salary} | ${o.appearDate}${size}`);
    if (o.industry) console.log(`    ${o.industry}`);
    if (skills) console.log(`    ${skills}`);
  }

  if (dryRun && sampleOffers.length > 0) {
    console.log(`\nSample（前 ${sampleOffers.length} 筆通過篩選，含已存在）：`);
    sampleOffers.forEach(printOffer);
  }

  if (newOffers.length > 0) {
    if (!dryRun) {
      console.log('\nNew offers:');
      newOffers.forEach(printOffer);
      console.log(`\nSaved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}.`);
      console.log('Run /career-ops pipeline to evaluate new offers.');
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
