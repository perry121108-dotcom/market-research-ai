# Project Rules Entry Point

Claude must read this file before making any code changes.

This project uses a QA-driven workflow. Do not rely only on chat context. Read the rule files and the latest QA log before editing code.

## Required Reading Order

1. `docs/QA_RULES.md`
2. `docs/CLAUDE_PROJECT_RULES.md`
3. Latest QA log in `docs/qa-logs/`
4. `docs/QA_MODIFICATION_REPORT_FOR_CLAUDE.md`

Current latest QA log:

```text
docs/qa-logs/2026-05-13_qa-log-03.md
```

## Non-Negotiable Rules

- Do not commit or expose API keys, tokens, secrets, or `.env.local`.
- Do not track `node_modules/`, `.next/`, `out/`, `dist/`, or build cache files.
- Do not render untrusted LLM/user/web content as raw HTML without sanitization.
- Do not trust API request bodies without validation.
- Do not assume QA findings from chat context. Use the QA log table as the source of truth.
- Do not run destructive git commands unless explicitly requested.

## Claude Task Source

Claude must use the modification table in:

```text
docs/qa-logs/2026-05-13_qa-log.md
```

Fix items by QA ID, then report:

- Files changed
- QA IDs addressed
- Verification commands run
- `git ls-files .env.local key.txt .next node_modules` result
- `npm run build` result
- Remaining risks
