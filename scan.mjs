#!/usr/bin/env node

/**
 * Zero-token portal scanner.
 *
 * Sources:
 * - Structured ATS APIs from tracked_companies: Greenhouse, Ashby, Lever
 * - Taiwan-oriented search_queries adapters: 104, CakeResume, Yourator, Meet.jobs
 *
 * Usage:
 *   node scan.mjs
 *   node scan.mjs --dry-run
 *   node scan.mjs --company Salesforce
 *   node scan.mjs --source 104
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_TERMS_PER_QUERY = 4;
const MAX_RESULTS_PER_QUERY = 20;

let playwrightBrowser = null;
let playwrightBrowserPromise = null;

mkdirSync('data', { recursive: true });

function ensurePipelineFile() {
  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(
      PIPELINE_PATH,
      '# Job Pipeline\n\n## Pending\n\n## Processed\n',
      'utf-8',
    );
  }
}

function parseYamlFile(path) {
  return yaml.load(readFileSync(path, 'utf-8'));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 career-ops scanner',
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  return await res.json();
}

async function fetchText(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  return await res.text();
}

async function getPlaywrightBrowser() {
  if (playwrightBrowser) return playwrightBrowser;
  if (playwrightBrowserPromise) return await playwrightBrowserPromise;
  const { chromium } = await import('playwright');
  playwrightBrowserPromise = chromium.launch({ headless: true });
  try {
    playwrightBrowser = await playwrightBrowserPromise;
    return playwrightBrowser;
  } finally {
    playwrightBrowserPromise = null;
  }
}

async function closePlaywrightBrowser() {
  if (!playwrightBrowser) return;
  await playwrightBrowser.close();
  playwrightBrowser = null;
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

function detectApi(company) {
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const ghMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghMatch) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghMatch[1]}/jobs`,
    };
  }

  return null;
}

function parseGreenhouse(json, companyName) {
  return (json.jobs || []).map(j => ({
    title: normalizeText(j.title),
    url: j.absolute_url || '',
    company: companyName,
    location: normalizeText(j.location?.name),
  }));
}

function parseAshby(json, companyName) {
  return (json.jobs || []).map(j => ({
    title: normalizeText(j.title),
    url: j.jobUrl || '',
    company: companyName,
    location: normalizeText(j.location),
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: normalizeText(j.text),
    url: j.hostedUrl || j.applyUrl || '',
    company: companyName,
    location: normalizeText(j.categories?.location),
  }));
}

const API_PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

function extractQuotedTerms(query) {
  const terms = [...String(query || '').matchAll(/"([^"]+)"/g)]
    .map(m => normalizeText(m[1]))
    .filter(Boolean)
    .filter(term => !term.toLowerCase().startsWith('site:'));

  return uniqueBy(terms, t => t.toLowerCase()).slice(0, MAX_TERMS_PER_QUERY);
}

function detectQueryProvider(query) {
  const q = String(query || '').toLowerCase();
  if (q.includes('104.com.tw')) return '104';
  if (q.includes('cakeresume.com')) return 'cakeresume';
  if (q.includes('yourator.co')) return 'yourator';
  if (q.includes('meet.jobs')) return 'meetjobs';
  if (q.includes('linkedin.com')) return 'linkedin';
  return 'unsupported';
}

async function scan104(term, sourceName) {
  const url = new URL('https://www.104.com.tw/jobs/search/list');
  url.searchParams.set('ro', '0');
  url.searchParams.set('kwop', '7');
  url.searchParams.set('keyword', term);
  url.searchParams.set('expansionType', 'area,spec,com,job,wf,wktm');
  url.searchParams.set('mode', 's');
  url.searchParams.set('jobsource', 'career-ops');
  url.searchParams.set('page', '1');

  let json = null;
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: {
        referer: 'https://www.104.com.tw/jobs/search/',
        accept: 'application/json,text/plain,*/*',
        'x-requested-with': 'XMLHttpRequest',
      },
    });
    const text = await res.text();
    if (res.headers.get('content-type')?.includes('json')) {
      json = JSON.parse(text);
    }
  } catch {
    json = null;
  }

  if (!json) {
    return await scan104WithBrowser(term, sourceName);
  }

  const list = json?.data?.list || [];
  return list.slice(0, MAX_RESULTS_PER_QUERY).map(job => {
    const jobNo = job.jobNo || job.jobno || job.link?.job || '';
    return {
      title: normalizeText(job.jobName || job.name),
      url: job.link?.job || (jobNo ? `https://www.104.com.tw/job/${jobNo}` : ''),
      company: normalizeText(job.custName || job.companyName),
      location: normalizeText(job.jobAddrNoDesc || job.location),
      source: sourceName,
    };
  });
}

async function scan104WithBrowser(term, sourceName) {
  const browser = await getPlaywrightBrowser();
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
  });

  try {
    const url = `https://www.104.com.tw/jobs/search?keyword=${encodeURIComponent(term)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
    await page.waitForTimeout(1200);

    const offers = await page.evaluate((source) => {
      function clean(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
      }

      function abs(href) {
        try {
          return new URL(href, location.href).toString().split('?')[0];
        } catch {
          return '';
        }
      }

      const anchors = Array.from(document.querySelectorAll('a[href*="/job/"]'));
      return anchors.map(anchor => {
        const card = anchor.closest('article') || anchor.closest('[class*="job"]') || anchor.parentElement;
        const companyAnchor = card?.querySelector('a[href*="/company/"], a[href*="/cust/"]');
        const title = clean(anchor.textContent);
        const url = abs(anchor.getAttribute('href'));
        const company = clean(companyAnchor?.textContent) || '104';
        const cardText = clean(card?.textContent);
        const locationMatch = cardText.match(/(台北市|新北市|桃園市|台中市|台南市|高雄市|新竹市|新竹縣|遠端|Remote)[^，,。| ]*/);

        return {
          title,
          url,
          company,
          location: locationMatch ? locationMatch[0] : '',
          source,
        };
      }).filter(job => job.title && job.url);
    }, sourceName);

    return uniqueBy(offers, o => o.url).slice(0, MAX_RESULTS_PER_QUERY);
  } finally {
    await page.close();
  }
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function absoluteUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return '';
  }
}

function extractHtmlJobs(html, baseUrl, patterns, sourceName) {
  const offers = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRe)) {
    const href = decodeHtml(match[1]);
    if (!patterns.some(p => p.test(href))) continue;

    const title = stripTags(match[2]);
    const url = absoluteUrl(baseUrl, href.split('?')[0]);
    if (!url || !title || title.length < 3) continue;

    offers.push({
      title,
      url,
      company: inferCompanyFromUrl(url),
      location: '',
      source: sourceName,
    });
  }

  return uniqueBy(offers, o => o.url).slice(0, MAX_RESULTS_PER_QUERY);
}

function inferCompanyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const companyIdx = parts.findIndex(p => ['companies', 'company'].includes(p));
    if (companyIdx !== -1 && parts[companyIdx + 1]) return parts[companyIdx + 1];
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function scanCakeResume(term, sourceName) {
  const url = `https://www.cakeresume.com/jobs?query=${encodeURIComponent(term)}`;
  const html = await fetchText(url);
  const offers = [];
  const anchorRe = /<a\b([^>]*class=["'][^"']*jobTitle[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRe)) {
    const attrs = match[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1] || '';
    if (!/\/companies\/[^/]+\/jobs\/[^/?#]+/i.test(href)) continue;

    const start = Math.max(0, match.index - 2500);
    const end = Math.min(html.length, match.index + 2500);
    const card = html.slice(start, end);
    const company = card.match(/class=["'][^"']*companyName[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] || '';

    offers.push({
      title: stripTags(match[2]),
      url: absoluteUrl(url, decodeHtml(href).split('?')[0]),
      company: stripTags(company) || inferCompanyFromUrl(href),
      location: '',
      source: sourceName,
    });
  }

  return uniqueBy(offers, o => o.url).slice(0, MAX_RESULTS_PER_QUERY);
}

async function scanYourator(term, sourceName) {
  const url = `https://www.yourator.co/jobs?term=${encodeURIComponent(term)}`;
  const html = await fetchText(url);
  return extractHtmlJobs(
    html,
    url,
    [/\/companies\/[^/]+\/jobs\/[^/?#]+/i],
    sourceName,
  );
}

async function scanMeetJobs(term, sourceName) {
  const url = `https://meet.jobs/jobs?q=${encodeURIComponent(term)}`;
  const html = await fetchText(url);
  return extractHtmlJobs(
    html,
    url,
    [/\/jobs\/[^/?#]+/i],
    sourceName,
  );
}

async function scanLinkedIn(term, sourceName) {
  const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(term)}&location=Taiwan`;
  const html = await fetchText(url);
  return extractHtmlJobs(
    html,
    url,
    [/\/jobs\/view\/[^/?#]+/i],
    sourceName,
  );
}

async function scanSearchQuery(searchQuery) {
  const provider = detectQueryProvider(searchQuery.query);
  const terms = extractQuotedTerms(searchQuery.query);
  const sourceName = searchQuery.name || provider;

  if (!searchQuery.enabled || provider === 'unsupported' || terms.length === 0) {
    return { offers: [], skipped: true, provider, name: sourceName };
  }

  const scanners = {
    '104': scan104,
    cakeresume: scanCakeResume,
    yourator: scanYourator,
    meetjobs: scanMeetJobs,
    linkedin: scanLinkedIn,
  };

  const offers = [];
  for (const term of terms) {
    const found = await scanners[provider](term, sourceName);
    offers.push(...found);
  }

  return {
    offers: uniqueBy(offers, o => o.url),
    skipped: false,
    provider,
    name: sourceName,
  };
}

function loadSeenUrls() {
  const seen = new Set();

  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x!]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (!existsSync(APPLICATIONS_PATH)) return seen;

  const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 5 || cells[1] === '#' || cells[3] === 'Company') continue;
    const company = normalizeKey(cells[3]);
    const role = normalizeKey(cells[4]);
    if (company && role) seen.add(`${company}::${role}`);
  }
  return seen;
}

function filterAndDedupOffers(offers, titleFilter, seenUrls, seenCompanyRoles, counters) {
  const out = [];
  for (const offer of offers) {
    const title = normalizeText(offer.title);
    const company = normalizeText(offer.company);
    const url = normalizeText(offer.url);
    if (!title || !company || !url) continue;

    if (!titleFilter(title)) {
      counters.filtered++;
      continue;
    }

    const roleKey = `${normalizeKey(company)}::${normalizeKey(title)}`;
    if (seenUrls.has(url) || seenCompanyRoles.has(roleKey)) {
      counters.duplicates++;
      continue;
    }

    seenUrls.add(url);
    seenCompanyRoles.add(roleKey);
    out.push({ ...offer, title, company, url });
  }
  return out;
}

function insertIntoPipeline(text, offers) {
  const pendingMarkers = ['## Pending', '## Pendientes', '## 待處理'];
  const processedMarkers = ['## Processed', '## Procesadas', '## 已處理'];
  const marker = pendingMarkers.find(m => text.includes(m)) || '## Pending';

  if (!text.includes(marker)) {
    const processed = processedMarkers.find(m => text.includes(m));
    const insertAt = processed ? text.indexOf(processed) : text.length;
    const block = `\n${marker}\n\n`;
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  const idx = text.indexOf(marker);
  const afterMarker = idx + marker.length;
  const nextSection = text.indexOf('\n## ', afterMarker);
  const insertAt = nextSection === -1 ? text.length : nextSection;
  const block = '\n' + offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n';
  return text.slice(0, insertAt) + block + text.slice(insertAt);
}

function appendToPipeline(offers) {
  if (offers.length === 0) return;
  ensurePipelineFile();
  const text = readFileSync(PIPELINE_PATH, 'utf-8');
  writeFileSync(PIPELINE_PATH, insertIntoPipeline(text, offers), 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }

  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source || ''}\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

async function parallelRun(tasks, limit) {
  let i = 0;
  const results = [];

  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const sourceFlag = args.indexOf('--source');
  const filterCompany = companyFlag !== -1 ? normalizeKey(args[companyFlag + 1]) : null;
  const filterSource = sourceFlag !== -1 ? normalizeKey(args[sourceFlag + 1]) : null;

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  ensurePipelineFile();

  const config = parseYamlFile(PORTALS_PATH);
  const companies = config.tracked_companies || [];
  const searchQueries = config.search_queries || [];
  const titleFilter = buildTitleFilter(config.title_filter);

  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();
  const counters = {
    found: 0,
    filtered: 0,
    duplicates: 0,
    apiTargets: 0,
    queryTargets: 0,
    skippedQueries: 0,
  };
  const errors = [];
  const newOffers = [];

  const apiTargets = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || normalizeKey(c.name).includes(filterCompany))
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  counters.apiTargets = apiTargets.length;

  const apiTasks = apiTargets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = API_PARSERS[type](json, company.name).map(j => ({
        ...j,
        source: `${company.name} ${type}-api`,
      }));
      counters.found += jobs.length;
      newOffers.push(...filterAndDedupOffers(jobs, titleFilter, seenUrls, seenCompanyRoles, counters));
    } catch (err) {
      errors.push({ source: company.name, error: err.message });
    }
  });

  const queryTargets = searchQueries
    .filter(q => q.enabled !== false)
    .filter(q => !filterSource || normalizeKey(q.name).includes(filterSource) || detectQueryProvider(q.query) === filterSource);

  counters.queryTargets = queryTargets.length;

  const queryTasks = queryTargets.map(query => async () => {
    try {
      const result = await scanSearchQuery(query);
      if (result.skipped) {
        counters.skippedQueries++;
        return;
      }
      counters.found += result.offers.length;
      newOffers.push(...filterAndDedupOffers(result.offers, titleFilter, seenUrls, seenCompanyRoles, counters));
    } catch (err) {
      errors.push({ source: query.name || query.query, error: err.message });
    }
  });

  const browserQueryTasks = queryTasks.filter((_, index) => detectQueryProvider(queryTargets[index].query) === '104');
  const nonBrowserQueryTasks = queryTasks.filter((_, index) => detectQueryProvider(queryTargets[index].query) !== '104');

  try {
    await parallelRun([...apiTasks, ...nonBrowserQueryTasks], CONCURRENCY);
    for (const task of browserQueryTasks) {
      await task();
    }
  } finally {
    await closePlaywrightBrowser();
  }

  const date = new Date().toISOString().slice(0, 10);

  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  console.log(`\nPortal Scan -- ${date}`);
  console.log('='.repeat(48));
  console.log(`ATS API targets:       ${counters.apiTargets}`);
  console.log(`Search queries:        ${counters.queryTargets}`);
  console.log(`Unsupported queries:   ${counters.skippedQueries}`);
  console.log(`Total jobs found:      ${counters.found}`);
  console.log(`Filtered by title:     ${counters.filtered}`);
  console.log(`Duplicates:            ${counters.duplicates}`);
  console.log(`New offers added:      ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e.source}: ${e.error}`);
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const offer of newOffers) {
      console.log(`  + ${offer.company} | ${offer.title} | ${offer.location || 'N/A'} | ${offer.source || 'unknown'}`);
    }
    if (dryRun) {
      console.log('\nDry run: no files were written.');
    } else {
      console.log(`\nSaved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}.`);
    }
  }

  console.log('\nRun /career-ops pipeline to evaluate new offers.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
