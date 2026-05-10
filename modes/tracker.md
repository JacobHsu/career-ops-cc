# Mode: tracker -- Application Tracker

Read and summarize `data/applications.md`.

Tracker format:

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
```

Canonical states come from `templates/states.yml`:

- `Evaluated`
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

Rules:
- Do not add new rows directly to `applications.md`; use tracker-addition TSV files and `node merge-tracker.mjs`.
- It is allowed to edit existing rows to update status or notes.
- Status must be exactly one canonical English state.
- No markdown, dates, or extra notes in the status field.

When the user asks for tracker status, show:
- Total applications
- Count by status
- Average score
- Percent with PDF
- Percent with report
- Highest-priority next actions
