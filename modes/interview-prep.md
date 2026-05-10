# Mode: interview-prep -- Company-Specific Interview Intelligence

Use this mode when the user wants to prepare for an interview, or when an application status changes to `Interview`.

## Inputs

- Company name and role title
- Existing evaluation report in `reports/`, if available
- `interview-prep/story-bank.md`, if available
- `cv.md` and `article-digest.md`, if available
- `config/profile.yml` and `modes/_profile.md`

## Step 1 -- Research

Use current search results and cite sources. Search for:

| Query | What To Extract |
|-------|-----------------|
| `"{company} {role} interview questions site:glassdoor.com"` | Reported questions, difficulty, process timeline |
| `"{company} interview process site:teamblind.com"` | Candidate process details and negotiation notes |
| `"{company} {role} interview site:leetcode.com/discuss"` | Coding and system design topics |
| `"{company} engineering blog"` | Tech stack, values, technical priorities |
| `"{company} interview process {role}"` | Additional candidate write-ups and prep guides |

Do not fabricate sourced questions. If a question is inferred from the JD, label it `[inferred from JD]`.

## Step 2 -- Process Overview

```markdown
## Process Overview
- **Rounds:** {N} rounds, about {X} days end-to-end
- **Format:** recruiter screen -> technical phone -> take-home -> onsite -> hiring manager
- **Difficulty:** {X}/5, if sourced
- **Known quirks:** {specific process notes}
- **Sources:** {links}
```

If data is missing, write `unknown -- not enough data`.

## Step 3 -- Round-by-Round Breakdown

For each discovered round:

```markdown
### Round {N}: {Type}
- **Duration:** {X} min
- **Conducted by:** {recruiter / peer / manager / unknown}
- **What they evaluate:** {skills or traits}
- **Reported questions:**
  - {question} -- [source]
- **How to prepare:** {1-2 concrete actions}
```

## Step 4 -- Likely Questions

Categorize discovered and inferred questions:
- Technical
- Behavioral
- Role-specific
- Background or transition questions

For each question, include:
- Source or `[inferred]`
- Why it matters
- Best candidate proof point
- Strong answer outline

## Step 5 -- Story Bank Mapping

Map likely questions to reusable STAR+R stories:

| # | Topic | Best Story | Fit | Gap |
|---|-------|------------|-----|-----|

If no story exists, suggest a specific experience from `cv.md` that could become one.

## Step 6 -- Technical Prep Checklist

Provide up to 10 focused prep items:

```markdown
- [ ] {topic} -- why: "{evidence}"
```

Prioritize by frequency and relevance.

## Step 7 -- Company Signals

Include:
- Values they screen for
- Vocabulary to use
- Things to avoid
- 2-3 questions to ask them

## Output

Save to:

`interview-prep/{company-slug}-{role-slug}.md`

Header:

```markdown
# Interview Intel: {Company} -- {Role}

**Report:** {link or N/A}
**Researched:** {YYYY-MM-DD}
**Sources:** {N} Glassdoor, {N} Blind, {N} other
```

## Rules

- Never invent interview questions and attribute them to sources.
- Never fabricate ratings or statistics.
- Cite everything or mark it `[inferred]`.
- Generate in the language of the JD, English by default.
- Keep the output practical and direct.
