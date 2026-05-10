# Mode: pdf -- ATS-Optimized CV PDF Generation

Generate a tailored, ATS-compatible CV PDF for a specific job.

## Full Pipeline

1. Read `cv.md`, `config/profile.yml`, `modes/_profile.md`, and `article-digest.md` if it exists.
2. Ask for the JD if it is not already in context.
3. Extract 15-20 relevant keywords from the JD.
4. Detect the JD language and generate the CV in that language, English by default.
5. Detect company/job location and choose paper format:
   - US/Canada: `letter`
   - Most other markets, including Taiwan: `a4`
6. Detect role archetype and adapt framing from `modes/_profile.md`.
7. Rewrite the Professional Summary with JD keywords and the candidate's transition narrative.
8. Select the top 3-4 most relevant projects.
9. Reorder work experience bullets by relevance to the JD.
10. Build a competency grid from 6-8 JD requirement phrases.
11. Inject keywords naturally into truthful existing experience.
12. Generate HTML from `templates/cv-template.html`.
13. Read candidate name from `config/profile.yml`, normalize to lowercase kebab-case, and use it in output filenames.
14. Write HTML to `output/cv-{candidate}-{company}-{YYYY-MM-DD}.html`.
15. Run:

```bash
node generate-pdf.mjs output/cv-{candidate}-{company}-{YYYY-MM-DD}.html output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}
```

16. Report the PDF path, page count if available, and keyword coverage.

## ATS Rules

- Single-column layout.
- Standard section headers: `Professional Summary`, `Work Experience`, `Projects`, `Education`, `Certifications`, `Skills`.
- No critical text in images, SVGs, headers, or footers.
- UTF-8 selectable text.
- No nested tables.
- Keywords distributed naturally across summary, experience, projects, and skills.
- Do not add skills or claims that are not supported by source files.

## PDF Design

Use `templates/cv-template.html`.

Default design:
- Fonts: Space Grotesk for headings, DM Sans for body.
- Header: candidate name, contact row, portfolio/GitHub links when present.
- Section headers: compact, uppercase, ATS-friendly.
- Body: readable 10.5-11.5px equivalent.
- Margins: about 0.6in.
- Background: white.

For Taiwan applications, default to A4 and keep the file concise. English CV is acceptable for many software roles; use Traditional Chinese only if the JD is Chinese or the user requests it.

## Section Order

1. Header
2. Professional Summary
3. Core Competencies
4. Work Experience
5. Projects
6. Education and Certifications
7. Skills

## Ethical Keyword Injection

Allowed:
- Rephrase real experience using JD vocabulary.
- Move relevant bullets earlier.
- Name technologies already present in `cv.md`, profile, or article digest.

Not allowed:
- Invent metrics.
- Add tools the candidate has not used.
- Inflate seniority or scope.
- Claim domain expertise from unrelated exposure.

## Template Placeholders

Replace placeholders from `templates/cv-template.html`:

| Placeholder | Content |
|-------------|---------|
| `{{LANG}}` | `en`, `zh-TW`, or JD language |
| `{{PAGE_WIDTH}}` | `8.5in` or `210mm` |
| `{{NAME}}` | Candidate name from profile |
| `{{PHONE}}` | Include only if non-empty |
| `{{EMAIL}}` | Candidate email |
| `{{LINKEDIN_URL}}` | Candidate LinkedIn URL |
| `{{LINKEDIN_DISPLAY}}` | Display form of LinkedIn URL |
| `{{PORTFOLIO_URL}}` | Portfolio URL |
| `{{PORTFOLIO_DISPLAY}}` | Display form of portfolio URL |
| `{{LOCATION}}` | Candidate location |
| `{{SECTION_SUMMARY}}` | Section title |
| `{{SUMMARY_TEXT}}` | Tailored summary |
| `{{SECTION_COMPETENCIES}}` | Section title |
| `{{COMPETENCIES}}` | Competency tags |
| `{{SECTION_EXPERIENCE}}` | Section title |
| `{{EXPERIENCE}}` | Experience HTML |
| `{{SECTION_PROJECTS}}` | Section title |
| `{{PROJECTS}}` | Project HTML |
| `{{SECTION_EDUCATION}}` | Section title |
| `{{EDUCATION}}` | Education HTML |
| `{{SECTION_CERTIFICATIONS}}` | Section title |
| `{{CERTIFICATIONS}}` | Certification HTML |
| `{{SECTION_SKILLS}}` | Section title |
| `{{SKILLS}}` | Skills HTML |

## Optional Canva Workflow

If `config/profile.yml` includes `cv.canva_resume_design_id`, offer:
- HTML/PDF: fast and ATS-optimized
- Canva CV: visual and design-preserving

Only use Canva if the user chooses it. Keep replacement text within the original design's character budget to avoid overlap.

## After Generation

If the offer is already tracked, update the existing tracker row's PDF field. Do not add duplicate application rows.
