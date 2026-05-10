# Mode: pipeline -- URL Inbox

Process pending job URLs from `data/pipeline.md`.

Users can add job URLs to the inbox at any time and then run `/career-ops pipeline`.

## Workflow

1. Read `data/pipeline.md` and find unchecked items under `Pending`.
2. Before processing, run:

```bash
node cv-sync-check.mjs
```

3. For each pending URL:
   - Compute the next sequential report number from `reports/`.
   - Extract the JD with Playwright first, then WebFetch, then WebSearch.
   - If inaccessible, mark the item as `[!]` with a short note and continue.
   - Run the full auto-pipeline: evaluation A-G, report, PDF if appropriate, tracker TSV.
   - Move the item from `Pending` to `Processed`.

4. If there are 3 or more URLs, batch independent evaluations when safe. Do not run multiple Playwright-controlled browser tasks in parallel.

5. After the batch, show a summary:

| # | Company | Role | Score | PDF | Recommended Action |
|---|---------|------|-------|-----|--------------------|

6. After each batch of evaluations, run:

```bash
node merge-tracker.mjs
```

## `pipeline.md` Format

```markdown
## Pending
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job -- Error: login required

## Processed
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | Senior Engineer | 4.2/5 | PDF yes
```

## JD Extraction

Priority:
1. Playwright: required for SPAs and for active/expired posting verification.
2. WebFetch: static HTML fallback.
3. WebSearch: last resort.

Special cases:
- LinkedIn may require login. Ask the user to paste the JD if needed.
- PDF URLs should be read as documents.
- `local:` paths should be read from the repo, e.g. `local:jds/company-role.md`.

## Numbering

List `reports/`, extract the numeric prefix, and use max + 1.

Use 3-digit zero-padded report numbers.
