# Mode: apply -- Live Application Assistant

Interactive mode for when the candidate is filling out an application form.

This mode reads the form context, loads the matching job report if available, and drafts personalized responses for copy-paste. Never submit the application for the user.

## Requirements

- Best with Playwright in visible mode so the user can see the browser.
- Without Playwright, the user can share a screenshot or paste the form questions.

## Workflow

```text
1. DETECT    -- Read active page, screenshot, URL, or pasted questions
2. IDENTIFY  -- Extract company and role
3. SEARCH    -- Match against existing reports in reports/
4. LOAD      -- Read full report and draft answers if present
5. COMPARE   -- Check whether the role changed
6. ANALYZE   -- Identify visible form questions
7. GENERATE  -- Draft personalized responses
8. PRESENT   -- Show responses for copy-paste
```

## Step 1 -- Detect the Job

With Playwright:
- Take a snapshot of the active page.
- Read title, URL, and visible form content.

Without Playwright, ask the candidate to:
- Share a screenshot of the form.
- Paste the form questions.
- Provide company and role so the report can be found.

## Step 2 -- Identify and Search for Context

1. Extract company name and role title.
2. Search `reports/` by company name.
3. If a match exists, load the full report.
4. If draft application answers already exist, use them as a base.
5. If there is no match, notify the user and offer to run a quick auto-pipeline.

## Step 3 -- Detect Role Changes

If the role on screen differs from the evaluated role:
- Notify the candidate.
- Ask whether to re-evaluate or adapt responses to the new title.
- If adapting, keep the existing report context but adjust phrasing.
- If re-evaluating, run the full evaluation and update the report.

## Step 4 -- Analyze Form Questions

Identify all visible questions:
- Free text fields
- Dropdowns
- Yes/No questions
- Salary expectations
- Work authorization
- Relocation or remote/hybrid availability
- Upload fields

Classify:
- Already answered in the report
- New question requiring a fresh answer

## Step 5 -- Generate Responses

Use:
1. Report context from Blocks B and F.
2. CV proof points.
3. Candidate profile and location policy.
4. Specific language from the visible JD or form.

Rules:
- Generate in the language of the form, English by default.
- Keep responses direct and specific.
- Do not invent experience.
- Do not include phone number unless the form explicitly asks.
- For salary, use `config/profile.yml`; if target is `TBD`, provide a flexible range-oriented answer and ask the user to confirm.
- For work authorization, do not assume overseas authorization; use the profile text and mark uncertain details for user review.

## Output Format

```markdown
## Responses for {Company} -- {Role}

Based on: Report #{num} | Score: {X.X}/5 | Archetype: {type}

### 1. {Exact form question}
> {Response ready for copy-paste}

### 2. {Next question}
> {Response}

Notes:
- {Any user review points}
- {Any mismatch or uncertainty}
```

## Step 6 -- Post-Apply

Only after the user confirms they submitted:
1. Update existing tracker status from `Evaluated` to `Applied`.
2. Add final responses to the report if useful.
3. Suggest `contacto` mode for targeted outreach.

Do not record drafts as submitted applications.
