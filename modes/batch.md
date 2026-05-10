# Mode: batch -- Mass Job Processing

Batch mode processes many job URLs with resumable state and isolated workers.

Use it only when the user explicitly wants batch processing.

## Architecture

Two modes:
- `conductor --chrome`: a visible browser navigates job portals and extracts postings.
- `standalone`: a script processes URLs already collected in `batch/batch-input.tsv`.

The conductor orchestrates. Each worker runs in a clean headless context and produces one report, one optional PDF, and one tracker-addition TSV.

## Files

```text
batch/
  batch-input.tsv
  batch-state.tsv
  batch-runner.sh
  batch-prompt.md
  logs/
  tracker-additions/
```

## Mode A: Conductor With Browser

1. Read `batch/batch-state.tsv` and skip completed jobs.
2. Navigate the portal in Chrome or Playwright.
3. Extract job URLs and append them to `batch/batch-input.tsv`.
4. For each pending URL:
   - Read the JD from the page or DOM.
   - Save JD text to a temporary file.
   - Calculate the next report number.
   - Start a headless worker using the correct CLI command from `AGENTS.md`.
   - Update `batch-state.tsv` with completed or failed status, score, and report number.
   - Write logs to `batch/logs/`.
5. Continue pagination until no more jobs are available.
6. Run `node merge-tracker.mjs`.

Do not run multiple Playwright browser sessions in parallel.

## Mode B: Standalone Script

```bash
batch/batch-runner.sh [OPTIONS]
```

Options:
- `--dry-run`: list pending jobs without executing
- `--retry-failed`: retry only failed jobs
- `--start-from N`: start from ID N
- `--parallel N`: run N independent workers
- `--max-retries N`: attempts per job, default 2

## `batch-state.tsv` Format

```text
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	failed	2026-...	2026-...	-	-	Error msg	1
3	https://...	pending	-	-	-	-	-	0
```

## Worker Output

Each worker must produce:
1. Markdown report in `reports/`
2. PDF in `output/` if applicable
3. Tracker line in `batch/tracker-additions/{id}.tsv`
4. Result JSON or concise status output

## Recovery

| Error | Recovery |
|-------|----------|
| URL inaccessible | Mark failed and continue |
| JD behind login | Ask user for pasted JD or mark failed |
| Portal layout changed | Adapt extraction and continue |
| Worker crash | Mark failed; retry with `--retry-failed` |
| Conductor crash | Re-run and skip completed jobs |
| PDF fails | Keep report and mark PDF pending |

After every batch, run:

```bash
node merge-tracker.mjs
```
