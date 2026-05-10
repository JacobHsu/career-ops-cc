# Mode: latex -- LaTeX / Overleaf CV Export

Export a tailored ATS-optimized CV as a `.tex` file and optionally compile it to PDF.

## Pipeline

1. Read `cv.md`.
2. Read `config/profile.yml`.
3. Read `modes/_profile.md`.
4. Ask for the JD if it is not already in context.
5. Extract 15-20 JD keywords.
6. Detect JD language, English by default.
7. Detect role archetype and adapt framing.
8. Rewrite the Professional Summary using truthful JD-aligned language.
9. Select the top 3-4 most relevant projects.
10. Reorder experience bullets by relevance.
11. Inject keywords naturally into existing achievements.
12. Generate `.tex` from `templates/cv-template.tex`.
13. Write to `output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex`.
14. Run:

```bash
node generate-latex.mjs output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf
```

15. Report `.tex` path, `.pdf` path, file sizes, section count, and keyword coverage.

Requires `tectonic` or `pdflatex` on PATH.

## Template Placeholders

| Placeholder | Source |
|-------------|--------|
| `{{NAME}}` | `candidate.full_name` from profile |
| `{{CONTACT_LINE}}` | Phone, location, visa/work authorization when present |
| `{{EMAIL_URL}}` | Raw email for `mailto:` URL |
| `{{EMAIL_DISPLAY}}` | Escaped email for display |
| `{{LINKEDIN_URL}}` | Full LinkedIn URL |
| `{{LINKEDIN_DISPLAY}}` | Display LinkedIn URL |
| `{{GITHUB_URL}}` | Full GitHub URL |
| `{{GITHUB_DISPLAY}}` | Display GitHub URL |
| `{{EDUCATION}}` | LaTeX education blocks |
| `{{EXPERIENCE}}` | LaTeX experience blocks |
| `{{PROJECTS}}` | LaTeX project blocks |
| `{{SKILLS}}` | LaTeX skills lines |

## LaTeX Content Rules

Education entry:

```latex
\resumeSubheading
  {Institution}{Location}
  {Degree}{Date Range}
```

Experience entry:

```latex
\resumeSubheading
  {Company}{Date Range}
  {Role Title}{Location}
  \resumeItemListStart
    \resumeItem{Bullet text}
  \resumeItemListEnd
```

Project entry:

```latex
\resumeProjectHeading{Project Name \emph{$|$ Context}}{Date}
\resumeItemListStart
  \resumeItem{Bullet text}
\resumeItemListEnd
```

Skills:

```latex
\textbf{Frontend}{: React, Vue, JavaScript} \\
\textbf{Backend}{: Node.js, Python, Django} \\
```

## Escaping Rules

Escape all user-supplied text before insertion:

| Character | Escape |
|-----------|--------|
| `&` | `\&` |
| `%` | `\%` |
| `$` | `\$` |
| `#` | `\#` |
| `_` | `\_` |
| `{` | `\{` |
| `}` | `\}` |
| `~` | `\textasciitilde{}` |
| `^` | `\textasciicircum{}` |
| `\` | `\textbackslash{}` |

Do not escape LaTeX commands themselves.

For `\href{URL}{display}`, keep the URL raw or percent-encoded and escape only the display text.

## ATS Rules

- Single-column layout.
- Standard section headers.
- UTF-8 and machine-readable text.
- No images or graphics.
- Keywords distributed naturally.
- No invented skills or metrics.

## Overleaf Compatibility

The generated file should compile with standard CTAN packages used by `templates/cv-template.tex`.

If local compilation is unavailable, provide the `.tex` path so the user can upload it to Overleaf.
