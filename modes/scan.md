# Mode: scan -- Job Portal Scanner

Scan configured job portals, filter relevant roles, and add new postings to `data/pipeline.md`.

The default script `scan.mjs` is zero-token and uses structured public APIs when configured. This mode describes the agent-assisted workflow for sources that need browsing, WebSearch, or manual verification.

## Configuration

Read `portals.yml`:
- `search_queries`: broad WebSearch queries
- `tracked_companies`: company career pages and optional ATS APIs
- `title_filter`: positive, negative, and seniority keywords

## Discovery Strategy

Use three levels:

1. **Direct browser scan**
   - Use Playwright for each enabled `tracked_companies` item with `careers_url`.
   - Extract all visible job titles and URLs.
   - This is the most reliable method for SPAs and company-hosted pages.

2. **ATS APIs and feeds**
   - Use configured `api` fields where present.
   - Supported patterns include Greenhouse, Ashby, Lever, BambooHR, Teamtailor RSS, and Workday.
   - Parse structured results and normalize to `{title, url, company}`.

3. **WebSearch discovery**
   - Use enabled `search_queries`.
   - Treat results as stale until verified.
   - Verify each new WebSearch result with Playwright before adding to pipeline.

Do not run multiple Playwright browser tasks in parallel.

## Workflow

1. Read `portals.yml`.
2. Read dedup sources:
   - `data/scan-history.tsv`
   - `data/applications.md`
   - `data/pipeline.md`
3. Collect candidate jobs from direct browser scans, APIs, and WebSearch.
4. Filter titles:
   - Must match at least one `title_filter.positive` keyword.
   - Must not match any `title_filter.negative` keyword.
   - `seniority_boost` increases priority but is not required.
5. Deduplicate by URL and normalized company+role.
6. Verify WebSearch results with Playwright:
   - Active: title, JD content, and Apply/Submit control are visible in the main content.
   - Expired: closed message, `?error=true`, no JD content, not found, or only navbar/footer.
7. Add verified new postings to `data/pipeline.md` under `Pending`:

```markdown
- [ ] {url} | {company} | {title}
```

8. Log every seen URL in `data/scan-history.tsv`:

```text
{url}\t{date}\t{source}\t{title}\t{company}\t{status}
```

Statuses:
- `added`
- `skipped_title`
- `skipped_dup`
- `skipped_expired`
- `failed`

## Taiwan Market Notes

For Taiwan-focused scanning, prioritize:
- 104
- CakeResume
- Yourator
- Meet.jobs
- LinkedIn Taiwan
- Company career pages for foreign companies with Taiwan offices
- Greenhouse, Ashby, Lever, Workday pages mentioning Taiwan, Taipei, remote, frontend, React, Vue, or full-stack

When scanning Taiwan portals, pay attention to:
- Monthly salary vs annual package
- Guaranteed months
- Bonus or profit sharing
- Hybrid location requirements
- Contractor vs employee wording
- Chinese and English title variants

Useful title variants:
- Senior Frontend Engineer
- Frontend Engineer
- Front-End Engineer
- React Engineer
- Vue Engineer
- Full-stack Engineer
- Full Stack Engineer
- Software Engineer, Frontend
- 前端工程師
- 資深前端工程師
- 全端工程師
- 資深全端工程師

## Output Summary

```text
Portal Scan -- {YYYY-MM-DD}

Queries run: N
Jobs found: N
Relevant after title filter: N
Duplicates: N
Expired discarded: N
New items added to pipeline.md: N

+ {company} | {title} | {source}
```

Then suggest running `/career-ops pipeline` to evaluate the new postings.

## Maintaining `portals.yml`

- Save working `careers_url` values for every tracked company.
- Prefer company-owned career URLs over raw ATS URLs.
- Add new companies when good postings are discovered.
- Disable noisy queries with `enabled: false`.
- Periodically verify `careers_url` values because companies change ATS platforms.
