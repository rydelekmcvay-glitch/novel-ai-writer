# Domain Docs

Single-context repo. Before exploring code, read:

- **`CONTEXT.md`** at the repo root — domain glossary and ubiquitous language
- **`docs/adr/`** — architectural decision records

If these files don't exist yet, proceed silently. Use `/grill-with-docs` to create them lazily.

## File structure

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   └── 0001-*.md
│   └── agents/
└── src/  (backend/ + frontend/)
```

## Use the glossary's vocabulary

When naming variables, issues, or refactors, use terms from `CONTEXT.md`. Don't drift to synonyms.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding.
