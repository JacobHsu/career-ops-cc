# Mode: followup -- Follow-up Cadence Tracker

Track active applications, flag overdue follow-ups, and draft concise follow-up messages.

## Inputs

- `data/applications.md` -- application tracker
- `data/follow-ups.md` -- follow-up history, created on first use
- `reports/` -- evaluation reports for context
- `config/profile.yml` -- candidate identity
- `cv.md` -- proof points

## Step 1 -- Run Cadence Script

```bash
node followup-cadence.mjs
```

Parse:
- metadata
- actionable entries
- urgency
- next follow-up date
- extracted contacts
- linked report path

If there are no actionable entries, tell the user:

> No active applications to follow up on. Apply to some roles first and come back when they are aging.

## Step 2 -- Display Dashboard

Sort by urgency: urgent, overdue, waiting, cold.

```text
Follow-up Cadence Dashboard -- {date}
{N} applications tracked, {N} actionable

| # | Company | Role | Status | Days | Follow-ups | Next | Urgency | Contact |
```

Urgency labels:
- `URGENT`: respond within 24 hours because the company replied.
- `OVERDUE`: follow-up is past due.
- `waiting`: follow-up is scheduled.
- `COLD`: 2+ follow-ups with no response; consider closing.

## Step 3 -- Generate Drafts

Generate drafts only for urgent or overdue entries.

For each draft:
1. Read the linked report.
2. Read `cv.md`.
3. Read `config/profile.yml`.

First follow-up:
- Subject line
- 3-4 sentences
- Reference role and application date
- Include one concrete proof point
- Soft ask for a short conversation
- Under 150 words

Avoid:
- "just checking in"
- "touching base"
- "circling back"
- desperate tone

Second follow-up:
- Shorter, 2-3 sentences
- Use a new angle or project update
- Do not repeat the first follow-up

Cold applications:
- Do not draft another follow-up.
- Suggest `Discarded`, a different contact via `contacto`, or deprioritizing.

## Step 4 -- Present Drafts

```markdown
## Follow-up: {Company} -- {Role} (#{num})

**To:** {email or "No contact found; run `/career-ops contacto` first"}
**Subject:** {subject line}
**Days since application:** {N}
**Follow-ups sent:** {N}
**Channel:** Email / LinkedIn

{draft text}
```

## Step 5 -- Record Sent Follow-ups

Only record follow-ups after the user confirms they sent them.

If `data/follow-ups.md` does not exist, create:

```markdown
# Follow-up History

| # | App# | Date | Company | Role | Channel | Contact | Notes |
|---|------|------|---------|------|---------|---------|-------|
```

Append a row with date, channel, contact, and brief notes.

Optionally update the existing application row note with `Follow-up {N} sent {YYYY-MM-DD}`.

## Cadence Defaults

| Status | First Follow-up | Subsequent | Max Attempts |
|--------|-----------------|------------|--------------|
| Applied | 7 days | Every 7 days | 2 |
| Responded | 1 day | Every 3 days | No fixed limit |
| Interview | 1 day after interview | Every 3 days | No fixed limit |
