# G2-LAYOUT-02-parley-eval

```yaml
id: G2-LAYOUT-02
goal: Pin/evaluate Parley shaping behind feature flag module; flow.rs fallback; WASM integration test
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-01]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-wasm/src/layout/shaping.rs
  - domdoc-wasm/docs/layout.md
  - domdoc-wasm/tests/layout_shaping.rs
  - packages/core/src/formats/docx/layout-shaping.test.ts
forbidden_paths:
  - domdoc-wasm/src/layout/fragmentation.rs
fixtures: [flow-wrap-parity]
commands:
  - cd domdoc-wasm && cargo test
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-shaping
deliverables: [PARLEY_PIN_COMMIT, parley-shaping feature stub, layout_flow_paragraph_shaped_json export]
status: review
```

Actual Parley dependency waits on WASM font stack proof; gate **G2** **not-run**.
