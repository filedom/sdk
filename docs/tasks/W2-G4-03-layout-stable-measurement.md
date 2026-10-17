# W2-G4-03-layout-stable-measurement

```yaml
id: W2-G4-03
goal: Browser fragmentation measurement tests tied to layout stability (paired passes + demo probe)
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-02]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/components/component-measurement-layout-stability.ts
  - e2e/fragmentation-layout-stability.spec.ts
forbidden_paths:
  - domdoc-wasm/**
fixtures: []
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-stability
  - cd domdoc-web && pnpm test:e2e
deliverables: [assertStableFragmentMeasurements, browser layout-stable e2e]
status: review
```

Component fragmentation gate **G4** remains **not-run** until full AF corpus in browser.
