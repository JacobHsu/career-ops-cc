# Mode: oferta -- Complete Job Evaluation A-G

When the user pastes a job posting or URL, always deliver the seven blocks below: A-F evaluation plus G posting legitimacy.

## Step 0 -- Archetype Detection

Classify the role into the closest archetype from `modes/_shared.md` and `modes/_profile.md`. If it is a hybrid, name the two closest archetypes.

This determines:
- Which proof points to prioritize in Block B
- How to frame the CV personalization plan in Block E
- Which STAR+R stories to prepare in Block F

## Block A -- Role Summary

Provide a compact table:

| Field | Value |
|-------|-------|
| Archetype | Detected archetype |
| Domain | Product/platform/data/AI/Web3/etc. |
| Function | Build/consult/manage/deploy/support |
| Seniority | Junior/Mid/Senior/Staff/Lead |
| Location | Remote/hybrid/on-site and city/country |
| Team context | Team size or org context if mentioned |
| TL;DR | One direct sentence |

## Block B -- CV Match

Read `cv.md`, `config/profile.yml`, `modes/_profile.md`, and `article-digest.md` if it exists.

Map job requirements to concrete evidence:

| JD Requirement | Evidence from CV/Profile | Strength | Notes |
|----------------|--------------------------|----------|-------|

Include a gaps section. For each gap:
1. Is it a hard blocker or nice-to-have?
2. Is there adjacent experience?
3. Is there a portfolio project that mitigates it?
4. What exact sentence should be used in the cover letter or interview?

Do not invent experience or metrics.

## Block C -- Level and Strategy

Cover:
- Detected level in the JD vs. the candidate's natural level
- How to sell seniority without exaggeration
- How to handle downleveling
- What to emphasize in the first recruiter screen

Use the candidate-specific framing from `modes/_profile.md`.

## Block D -- Compensation and Market Demand

Use current market data where possible. Search sources appropriate to the market:
- Global: Levels.fyi, Glassdoor, Blind, LinkedIn, company compensation pages
- Taiwan: 104 salary data, CakeResume, Yourator, Meet.jobs, LinkedIn Taiwan, public JD salary ranges

If data is unavailable, say so. Do not invent ranges.

Return:

| Source | Data Point | Relevance | Notes |
|--------|------------|-----------|-------|

For Taiwan roles, explicitly distinguish monthly salary, annual salary, guaranteed months, bonus, equity, contractor rate, and benefits where available.

## Block E -- Personalization Plan

List the top CV and application changes:

| # | Section | Current framing | Proposed change | Why |
|---|---------|-----------------|-----------------|-----|

Include:
- Top 5 CV changes
- Top 5 LinkedIn/profile changes, if relevant
- Keywords to include naturally

## Block F -- Interview Plan

Prepare 6-10 STAR+R stories mapped to the JD:

| # | JD Requirement | Story | S | T | A | R | Reflection |
|---|----------------|-------|---|---|---|---|------------|

Also include:
- The strongest case study to present
- Likely technical questions
- Red-flag questions and direct answers
- Questions the candidate should ask the company

If `interview-prep/story-bank.md` exists, reuse or append durable stories there when appropriate.

## Block G -- Posting Legitimacy

Assess whether the posting looks real and active. Present observations, not accusations.

Signals to analyze:
- Posting date or freshness
- Active Apply button or application flow
- JD specificity and internal consistency
- Company hiring signals, layoffs, or hiring freeze news
- Reposting pattern from `data/scan-history.tsv`
- Whether the role makes sense for the company

Assessment tier:
- `High Confidence`
- `Proceed with Caution`
- `Suspicious`

Return:

| Signal | Finding | Weight |
|--------|---------|--------|

Always include context notes and legitimate explanations for concerning signals.

## Save Report

After producing Blocks A-G, save the report to:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

Header format:

```markdown
# Evaluation: {Company} -- {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X.X/5}
**URL:** {job URL or source}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}
```

Use 3-digit sequential numbering based on existing files in `reports/`.

## Tracker Entry

For new evaluations, do not edit `data/applications.md` directly. Write one TSV file:

`batch/tracker-additions/{num}-{company-slug}.tsv`

TSV columns:

```text
{num}\t{date}\t{company}\t{role}\tEvaluated\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

Then run `node merge-tracker.mjs`.

Use canonical English states from `templates/states.yml`.
