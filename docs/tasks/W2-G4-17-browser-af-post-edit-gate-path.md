# W2-G4-17-browser-af-post-edit-gate-path

```yaml
id: W2-G4-17
goal: Browser AF corpus post-edit scale + authoritative gate proof path hooks
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-16]
write_paths:
  - packages/core/src/components/fragmentation-af-browser-post-edit-gate-grade.ts
  - packages/demo/src/main.ts
  - e2e/fragmentation-af-post-edit-gate-grade.spec.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-browser-post-edit-gate-grade
  - cd domdoc-web && pnpm test:e2e
deliverables: [demo data-af-post-edit-* + Playwright W2-G4-17 spec; authoritativeGatePath not-run]
status: review
```

G4 authoritative gate equivalence **not-run**; gate **G4 not-run**.
