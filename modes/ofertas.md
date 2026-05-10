# Mode: ofertas -- Multi-Offer Comparison

Compare multiple jobs, offers, or opportunities.

Ask the user for the offers if they are not already in context. Inputs may be:
- JD text
- URLs
- Existing report numbers
- Tracker rows

## Scoring Matrix

Score each dimension from 1-5 and compute a weighted total.

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| Target-role alignment | 25% | Exact target role vs. unrelated |
| CV match | 15% | Evidence-backed fit |
| Level | 15% | Seniority and scope fit |
| Compensation | 10% | Market-adjusted total package |
| Growth path | 10% | Clear next-level path |
| Remote/location fit | 5% | Remote, hybrid, commute, timezone |
| Company reputation | 5% | Stability, culture, red flags |
| Tech stack fit | 5% | Modern and relevant to target roles |
| Speed to offer | 5% | Likely process length |
| Cultural signals | 5% | Builder culture vs. bureaucracy |

## Output

Return:
- Ranking table
- Weighted score for each offer
- Main upside
- Main risk
- Recommended action
- What to negotiate or clarify next

For Taiwan roles, compare total package carefully: monthly salary, guaranteed months, bonus, equity, contractor status, leave, remote policy, and benefits.
