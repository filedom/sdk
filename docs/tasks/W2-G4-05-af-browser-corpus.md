# W2-G4-05-af-browser-corpus

```yaml
id: W2-G4-05
goal: AF fragmentation browser corpus with live WASM layout where testable
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-04]
write_paths:
  - packages/core/src/components/fragmentation-af-browser-corpus.ts
  - packages/demo/src/main.ts
  - e2e/fragmentation-af-corpus.spec.ts
forbidden_paths:
  - domdoc-wasm/**
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af
  - cd domdoc-web && pnpm test:e2e
deliverables: [AF_BROWSER_CORPUS, demo data-af-corpus-* datasets]
status: review
```

Full AF gate proof **not-run**; gate **G4** **not-run**.
