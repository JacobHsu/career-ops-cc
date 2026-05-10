# Mode: patterns -- Rejection Pattern Detector

Analyze tracked applications to identify what is working and what is wasting time.

## Inputs

- `data/applications.md` -- application tracker
- `reports/` -- evaluation reports
- `config/profile.yml` -- user profile
- `modes/_profile.md` -- user archetypes and framing
- `portals.yml` -- portal configuration

## Minimum Threshold

Before running, check whether `data/applications.md` has at least 5 entries beyond `Evaluated`: `Applied`, `Responded`, `Interview`, `Offer`, `Rejected`, `Discarded`, or `SKIP`.

If not, tell the user:

> Not enough data yet -- {N}/5 applications have progressed beyond evaluation. Keep applying and come back when there are more outcomes to analyze.

## Step 1 -- Run Analysis Script

```bash
node analyze-patterns.mjs
```

Parse the JSON output:

| Key | Contents |
|-----|----------|
| `metadata` | Total entries, date range, analysis date, counts by outcome |
| `funnel` | Count per status stage |
| `scoreComparison` | Score stats per outcome group |
| `archetypeBreakdown` | Performance by archetype |
| `blockerAnalysis` | Frequent hard blockers |
| `remotePolicy` | Results by remote/location policy |
| `companySizeBreakdown` | Startup, scaleup, enterprise patterns |
| `scoreThreshold` | Recommended minimum score |
| `techStackGaps` | Frequent skill gaps |
| `recommendations` | Actionable recommendations |

If the script returns an error, display it and stop.

## Step 2 -- Generate Report

Write:

`reports/pattern-analysis-{YYYY-MM-DD}.md`

Report sections:
- Applications analyzed
- Date range
- Conversion funnel
- Score vs. outcome
- Archetype performance
- Top blockers
- Remote/location policy patterns
- Tech stack gaps
- Recommended score threshold
- Recommendations

## Step 3 -- Present Summary

Show:
1. One-line stat summary.
2. Top 3 findings.
3. Link to full report.

## Step 4 -- Offer to Apply Recommendations

Offer concrete edits:
- Update `portals.yml` filters.
- Add score threshold to `config/profile.yml`.
- Adjust user archetypes in `modes/_profile.md`.

Never put user-specific targeting changes in `modes/_shared.md`.

## Outcome Classification

| Status | Outcome |
|--------|---------|
| `Interview`, `Offer`, `Responded`, `Applied` | Positive |
| `Rejected`, `Discarded` | Negative |
| `SKIP` | Self-filtered |
| `Evaluated` | Pending |
