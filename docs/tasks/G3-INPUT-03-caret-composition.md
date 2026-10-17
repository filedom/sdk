# G3-INPUT-03-caret-composition

```yaml
id: G3-INPUT-03
goal: Caret mapping from geometry/paint wire types; composition transaction stub; Playwright spike documented (not wired)
requirements: [F12]
acceptance: [O, AE-subset]
depends_on: [G3-INPUT-02]
base_pair: { wasm_commit: 4b2e3e7755eaad3bc190825449a38ea9936df0f2, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/editing/**
  - packages/core/src/compositor/**
  - evidence/gates/G3-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
fixtures: [I10-caret-map, IME-stub]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/editing
deliverables: [caret-map.ts, composition-stub.ts, pointerDownWithCaret, tests]
status: review
```

## Playwright spike (deferred)

Adding `@playwright/test` to the monorepo is not a W1 quick win (no app shell target yet). Follow-on: dedicated `apps/shell` page + `playwright.config.ts` exercising IME composition against real layout paint; until then, happy-dom + stub transactions suffice. Gate **G3** **not-run**.
