# W2-G4-02-component-measurement

```yaml
id: W2-G4-02
goal: Web component measurement contract tests aligned with WASM fragmentation break tokens
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-01]
base_pair: { wasm_commit: ee8ddb0c1173e9f97d13c618bca8fde376343d04, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/components/component-measurement-contract.ts
  - packages/core/src/components/component-measurement-contract.test.ts
forbidden_paths:
  - domdoc-wasm/src/layout/flow.rs
fixtures: []
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test component-measurement
deliverables: [measureFragmentFromBounds, contract tests]
status: review
```

Browser fragmentation proof and layout-stable measurement remain follow-on; gate **G4** **not-run**.
