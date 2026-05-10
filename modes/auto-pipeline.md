# Mode: auto-pipeline -- Complete Job Pipeline

When the user pastes a JD or job URL without an explicit sub-command, run the full pipeline.

## Step 0 -- Extract the JD

If the input is a URL:

1. Use Playwright first for job portals and SPAs such as Lever, Ashby, Greenhouse, Workday, and custom career pages.
2. Use WebFetch as fallback for static pages.
3. Use WebSearch as a last resort to find indexed copies of the job posting.

If no method works, ask the candidate to paste the JD text or share a screenshot.

If the input is already JD text, use it directly.

## Step 1 -- Evaluate A-G

Run the same evaluation as `modes/oferta.md`:
- A Role Summary
- B CV Match
- C Level and Strategy
- D Compensation and Market Demand
- E Personalization Plan
- F Interview Plan
- G Posting Legitimacy

## Step 2 -- Save Report

Save the complete evaluation to:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

The header must include:
- `**URL:**`
- `**Legitimacy:**`
- `**PDF:**`

## Step 3 -- Generate PDF

Read `config/profile.yml`.

- If `cv.output_format` is `latex`, follow `modes/latex.md`.
- Otherwise, follow `modes/pdf.md`.

If PDF generation fails, continue and mark PDF as pending.

## Step 4 -- Draft Application Answers

If the final score is 4.5 or higher, draft application form answers and save them under:

`## H) Draft Application Answers`

Use common questions if the live form is unavailable:
- Why are you interested in this role?
- Why this company?
- Tell us about a relevant project or achievement.
- What makes you a good fit?
- How did you hear about this role?

Tone:
- Confident without arrogance
- Selective and specific
- Direct, 2-4 sentences per answer
- Evidence-first: use a real project or result instead of generic claims
- Language of the JD, English by default

## Step 5 -- Update Tracker

Write a tracker-addition TSV as described in `modes/oferta.md`, then run:

```bash
node merge-tracker.mjs
```

If any step fails, continue with the remaining steps and mark the failed step as pending in the report and tracker note.
