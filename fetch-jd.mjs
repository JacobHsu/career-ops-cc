#!/usr/bin/env node

/**
 * fetch-jd.mjs — 104 單一職缺 JD + 公司簡介抓取工具
 *
 * 給定 104 職缺 URL，呼叫 104 API 下載 JD，並自動補抓公司網站的
 * 公司簡介與主要商品/服務，存為 Markdown。不消耗 AI token。
 *
 * 使用方式：
 *   node fetch-jd.mjs https://www.104.com.tw/job/{jobNo}
 *   npm run fetch104 -- https://www.104.com.tw/job/{jobNo}
 *
 * 輸出：jds/{jobNo}.md
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';

const JDS_DIR = 'jds';
const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractJobNo(url) {
  const m = String(url).match(/104\.com\.tw\/job\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

// Extract URLs from plain text (company website, LinkedIn, etc.)
function extractUrls(text) {
  const matches = [...String(text).matchAll(/https?:\/\/[^\s,，。\n\)）]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,，。\n\)）]*/g)];
  return matches.map(m => {
    let u = m[0].replace(/[.。,，]+$/, '');
    if (!u.startsWith('http')) u = 'https://' + u;
    return u;
  }).filter(u => !u.includes('104.com.tw') && !u.includes('linkedin.com'));
}

async function doFetch(url, headers, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

// ── 104 API: JD detail ────────────────────────────────────────────────────────

async function fetchJobDetail(jobNo) {
  const res = await doFetch(
    `https://www.104.com.tw/job/ajax/content/${jobNo}`,
    {
      'User-Agent': USER_AGENT,
      'Referer': `https://www.104.com.tw/job/${jobNo}`,
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      'X-Requested-With': 'XMLHttpRequest',
    }
  );

  if (!res.ok) throw new Error(`HTTP ${res.status} — 104 API 拒絕請求`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new Error(`回應非 JSON（${ct}）— 104 可能已更改 API`);

  const json = await res.json();
  return json.data || json;
}


// ── Company website: intro + products/services ───────────────────────────────

async function fetchCompanyWebsite(siteUrl) {
  try {
    const res = await doFetch(
      siteUrl,
      {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,*/*',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      10_000
    );
    if (!res.ok) return null;
    const html = await res.text();

    // og:description or meta description
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,})/i)?.[1]
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,})/i)?.[1]
      || '';

    // JSON-LD name/description
    let ldName = '', ldDesc = '';
    const ldMatch = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        ldName = ld.name || '';
        ldDesc = ld.description || '';
      } catch { /* ignore */ }
    }

    // Extract visible text from <p> and <h> tags (product/service hints)
    const noScript = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    const textBlocks = [...noScript.matchAll(/<(h[1-4]|p)[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(m =>
        m[2]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ')
          .replace(/&copy;[^<]*/g, '').replace(/©[^\n]*/g, '')
          .replace(/\s+/g, ' ').trim()
      )
      .filter(t =>
        t.length > 30 &&
        t.length < 400 &&
        // skip nav bars (contain 3+ capitalized words concatenated with no spaces between)
        !/([A-Z][a-z]+){4,}/.test(t.replace(/\s/g, '')) &&
        !/copyright|cookie|privacy|all rights reserved/i.test(t) &&
        // skip lines that are mostly non-alphabetic
        (t.match(/[a-zA-Z一-龥]/g) || []).length > t.length * 0.3
      );

    return {
      url: siteUrl,
      intro: ldDesc || ogDesc || '',
      brandName: ldName || '',
      contentBlocks: textBlocks.slice(0, 12),
    };
  } catch {
    return null;
  }
}

// Extract company intro paragraph from JD text (text before first 【】block)
function extractJdCompanyIntro(jobDescription) {
  const text = jobDescription || '';
  // Find first section marker
  const sectionIdx = text.search(/【[^】]+】/);
  const intro = sectionIdx > 0 ? text.slice(0, sectionIdx).trim() : '';
  return intro.length > 30 ? intro : '';
}

// ── Markdown 產生 ─────────────────────────────────────────────────────────────

function buildMarkdown(jobNo, data, websiteInfo) {
  const header = data.header || {};
  const jobDetail = data.jobDetail || {};
  const condition = data.condition || {};
  const welfare = data.welfare || {};

  const industryFromApi = data.industry || '';
  const employeesFromApi = (() => {
    const e = String(data.employees || '').trim();
    return e && e !== '暫不提供' ? e : '';
  })();

  const title = stripHtml(header.jobName || '（職位未知）');
  const companyName = stripHtml(header.custName || '（公司未知）');
  const companyUrl = header.custUrl || '';
  const custNo = data.custNo || '';
  const locationParts = [jobDetail.addressRegion, jobDetail.addressArea].filter(Boolean);
  const location = locationParts.join(' ') || '未提供';
  const addressDetail = jobDetail.addressDetail ? jobDetail.addressDetail.trim() : '';

  let salary = '面議';
  if (jobDetail.salaryMin && jobDetail.salaryMax) {
    salary = `${Number(jobDetail.salaryMin).toLocaleString()}～${Number(jobDetail.salaryMax).toLocaleString()} 元`;
  } else if (jobDetail.salaryMin) {
    salary = `${Number(jobDetail.salaryMin).toLocaleString()} 元以上`;
  }

  const rawJobDesc = stripHtml(jobDetail.jobDescription || '');
  const requirement = stripHtml(condition.other || '');
  const welfareText = stripHtml(welfare.welfare || '');

  const lines = [
    `# ${title} — ${companyName}`,
    '',
    `**職缺 URL**: https://www.104.com.tw/job/${jobNo}`,
    `**公司頁面**: ${companyUrl || `https://www.104.com.tw/company/${custNo}`}`,
    `**地點**: ${location}${addressDetail ? `（${addressDetail}）` : ''}`,
    `**薪資**: ${salary}`,
    `**抓取日期**: ${today()}`,
    '',
  ];

  // ── JD 主體（優先）──
  if (rawJobDesc) lines.push('## 工作內容', '', rawJobDesc, '');
  if (requirement) lines.push('## 條件要求', '', requirement, '');
  if (welfareText) lines.push('## 福利制度', '', welfareText, '');

  // ── 公司簡介 ──
  lines.push('## 公司簡介', '');
  if (industryFromApi) lines.push(`**產業**: ${industryFromApi}`);
  if (employeesFromApi) lines.push(`**員工人數**: ${employeesFromApi}`);

  const companyWebsite = websiteInfo?.url || '';
  if (companyWebsite) lines.push(`**官網**: ${companyWebsite}`);
  if (websiteInfo?.brandName) lines.push(`**品牌名稱**: ${websiteInfo.brandName}`);

  lines.push('');

  // 官網摘要（若有抓到）
  const siteIntro = websiteInfo?.intro || '';
  const jdIntro = extractJdCompanyIntro(rawJobDesc);
  if (siteIntro) lines.push(siteIntro, '');
  if (jdIntro && jdIntro !== siteIntro) lines.push(jdIntro, '');

  // 若無任何摘要，留空白區塊讓使用者自行填寫
  if (!siteIntro && !jdIntro) lines.push('<!-- 請自行補充公司介紹 -->', '');

  // ── 主要商品 / 服務項目（官網抓到時才輸出）──
  if (websiteInfo?.contentBlocks?.length) {
    lines.push('## 主要商品 / 服務項目', '');
    lines.push('*以下摘自公司官網：*', '');
    websiteInfo.contentBlocks.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('用法：node fetch-jd.mjs <104職缺URL>');
    console.error('範例：node fetch-jd.mjs https://www.104.com.tw/job/{jobNo}');
    process.exit(1);
  }

  const jobNo = extractJobNo(url);
  if (!jobNo) {
    console.error('無法解析職缺編號，請確認 URL 格式：https://www.104.com.tw/job/{jobNo}');
    process.exit(1);
  }

  console.log(`\n抓取 JD：https://www.104.com.tw/job/${jobNo}`);

  let data;
  try {
    data = await fetchJobDetail(jobNo);
  } catch (err) {
    console.error(`\n抓取失敗：${err.message}`);
    console.error('建議：用瀏覽器開啟職缺頁，複製 JD 文字後貼入 /career-ops oferta。');
    process.exit(1);
  }

  const companyName = stripHtml(data.header?.custName || '');

  console.log(`產業：${data.industry || '未提供'}，員工：${data.employees || '未提供'}`);

  // Company website from JD text (if company includes external URL in JD)
  const allText = stripHtml(data.jobDetail?.jobDescription || '') + ' ' + (data.header?.custUrl || '');
  const siteUrls = extractUrls(allText);
  let websiteInfo = null;
  if (siteUrls.length) {
    process.stdout.write(`公司官網 ${siteUrls[0]} ... `);
    websiteInfo = await fetchCompanyWebsite(siteUrls[0]);
    console.log(websiteInfo ? `取得 ${websiteInfo.contentBlocks.length} 段` : '無法取得');
  }

  if (!existsSync(JDS_DIR)) mkdirSync(JDS_DIR, { recursive: true });

  const markdown = buildMarkdown(jobNo, data, websiteInfo);
  const outPath = `${JDS_DIR}/${jobNo}.md`;
  writeFileSync(outPath, markdown, 'utf-8');

  const title = stripHtml(data.header?.jobName || '');

  console.log(`\n✓ 儲存完成：${outPath}`);
  console.log(`  公司：${companyName}`);
  console.log(`  職位：${title}`);
  console.log(`  字數：${markdown.length} 字`);
  console.log(`\n下一步：`);
  console.log(`  /career-ops oferta        → 評分此職缺`);
  console.log(`  /career-ops interview-prep → 面試準備（使用 local:${outPath}）\n`);
}

main();
