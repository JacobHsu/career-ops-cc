# System Context -- career-ops

<!--
This file is auto-updatable. Do not put personal data here.
User-specific customization belongs in modes/_profile.md and config/profile.yml.
-->

## Sources of Truth

| File | Path | When |
|------|------|------|
| CV | `cv.md` | Always |
| Article digest | `article-digest.md` | If it exists |
| Profile | `config/profile.yml` | Always |
| User profile mode | `modes/_profile.md` | Always, after this file |
| Writing samples | `writing-samples/` | Only for user-facing text when no cached style exists |

Rules:
- Never hardcode metrics from memory. Read them from `cv.md` and `article-digest.md`.
- If `article-digest.md` and `cv.md` conflict on project metrics, prefer `article-digest.md`.
- Read `modes/_profile.md` after this file. User customization overrides defaults.

## Scoring System

Evaluations use six score dimensions plus a separate posting legitimacy block.

| Dimension | What It Measures |
|-----------|------------------|
| CV match | Skills, experience, proof point alignment |
| Target alignment | Fit with the user's target archetypes |
| Compensation | Salary or total package vs. market |
| Company and culture | Stability, growth, team quality, remote policy |
| Red flags | Blockers and warnings |
| Global | Weighted overall recommendation |

Score interpretation:
- 4.5+: Strong match, recommend applying soon.
- 4.0-4.4: Good match, worth applying.
- 3.5-3.9: Decent but not ideal, apply only with a specific reason.
- Below 3.5: Recommend against applying unless the user has a clear override reason.

## Posting Legitimacy

Block G assesses whether a posting appears real and active. It does not affect the global 1-5 score.

Tiers:
- `High Confidence`: most signals suggest a real active opening.
- `Proceed with Caution`: mixed or limited signals.
- `Suspicious`: multiple concerning signals; investigate before investing time.

Signals:

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Posting age | Page snapshot | High | Under 30 days is positive; 30-60 is mixed; 60+ can be concerning depending on role |
| Apply button active | Page snapshot | High | Direct observable fact |
| JD specificity | JD text | Medium | Specific tech, team, and scope are positive |
| Requirements realism | JD text | Medium | Contradictions matter more than vagueness |
| Hiring news | WebSearch | Medium | Consider timing, department, and company size |
| Reposting pattern | `scan-history.tsv` | Medium | Repeated reposts in 90 days can be concerning |
| Salary transparency | JD text | Low | Jurisdiction-dependent |
| Role-company fit | Qualitative | Low | Supporting signal only |

Ethical framing:
- Present observations, not accusations.
- Include legitimate explanations for concerning signals.
- Let the user decide how to weigh the risk.

## Default Archetype Detection

Classify every role into the closest default archetype, then apply the user's custom archetypes from `modes/_profile.md`.

| Archetype | Signals |
|-----------|---------|
| Frontend Product Engineer | React, Vue, UI, SPA, dashboard, design systems, frontend architecture |
| Full-stack Web Engineer | Frontend plus backend APIs, database, deployment, product ownership |
| AI / Data Product Engineer | AI workflow, data UI, reporting, automation, analytics products |
| Web3 / DeFi Engineer | Wallets, trading UI, crypto, token swaps, blockchain integration |
| Platform / Infrastructure Engineer | Reliability, observability, CI/CD, cloud, internal platforms |
| Product / Technical Lead | Roadmap, discovery, stakeholders, delivery leadership |

If the role does not fit these defaults, classify it plainly and explain.

## Global Rules

### Never

1. Invent experience or metrics.
2. Submit applications on behalf of the user.
3. Share phone number in generated outreach unless the user explicitly asks.
4. Recommend compensation below credible market rate.
5. Generate a PDF without reading the JD.
6. Use corporate filler.
7. Add duplicate tracker entries.

### Always

1. Read `cv.md`, `config/profile.yml`, `modes/_profile.md`, and `article-digest.md` if it exists.
2. On the first evaluation of each session, run `node cv-sync-check.mjs`; report warnings.
3. Detect role archetype and adapt framing through `modes/_profile.md`.
4. Map JD requirements to exact evidence from the CV/profile.
5. Use current sources for compensation and company data when evaluating.
6. Generate in the language of the JD, English by default.
7. Use canonical tracker states from `templates/states.yml`.
8. Write new tracker additions as TSV files in `batch/tracker-additions/`, then run `node merge-tracker.mjs`.
9. Include `**URL:**` in every report header.
10. Include `**Legitimacy:**` in every report header.

## Taiwan Market Defaults

When a role targets Taiwan or the candidate is applying from Taiwan:
- Use A4 for PDFs.
- Treat monthly salary, annual package, guaranteed months, bonus, equity, and benefits separately.
- Consider Labor Insurance, National Health Insurance, pension contribution, special leave, year-end bonus, and hybrid/remote policy when comparing offers.
- Prefer Taiwan-relevant sources when available: 104 salary data, CakeResume, Yourator, Meet.jobs, LinkedIn Taiwan, and public JD salary ranges.
- For overseas remote roles, explicitly evaluate timezone overlap and work authorization.

## Tools

| Tool | Use |
|------|-----|
| WebSearch | Compensation, company research, hiring signals, contacts, fallback JD discovery |
| WebFetch | Static JD extraction fallback |
| Playwright | Live job verification and SPA extraction |
| Local reads | `cv.md`, profile, modes, reports, templates |
| Local writes | Reports, tracker TSVs, generated HTML/PDF |
| Canva MCP | Optional visual CV workflow when configured |
| Bash/Node | Project scripts such as PDF generation and tracker merge |

Do not run multiple Playwright browser tasks in parallel.

## Writing Style Calibration

Before generating user-facing text, check `modes/_profile.md` for a `## Writing Style` section. If it exists, use it.

If no cached style exists:
1. Read files in `writing-samples/`, excluding any `README.md`.
2. Extract only style traits, not content or personal identifiers.
3. Save one canonical `## Writing Style` section in `modes/_profile.md`.

Extract:
- Tone and register
- Sentence length and openings
- Punctuation habits
- Vocabulary preferences
- Paragraph structure
- First-person and active/passive patterns
- Patterns to avoid

Do not infer a style from a single weak example.

## Professional Writing and ATS Compatibility

Avoid:
- "passionate about"
- "results-oriented"
- "proven track record"
- "leveraged"
- "spearheaded"
- "facilitated"
- "synergies"
- "robust"
- "seamless"
- "cutting-edge"
- "innovative"
- "in today's fast-paced world"
- "demonstrated ability to"

Prefer:
- Specific tools, projects, and outcomes.
- Short active sentences.
- Direct evidence over abstract claims.
- Existing truthful metrics only.

`generate-pdf.mjs` normalizes smart punctuation for ATS compatibility, but generated text should stay simple and machine-readable.
