# G2-LAYOUT-03-font-stack-parley

```yaml
id: G2-LAYOUT-03
goal: WASM font stack + optional parley-shaping feature; prove shaped backend id when enabled, flow fallback when disabled
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-02]
base_pair: { wasm_commit: TBD, web_commit: ee8ddb0c1173e9f97d13c618bca8fde376343d04 }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-wasm/src/layout/font_stack.rs
  - domdoc-wasm/src/layout/shaping.rs
  - domdoc-wasm/docs/layout.md
  - domdoc-wasm/Cargo.toml
forbidden_paths:
  - domdoc-wasm/src/layout/fragmentation.rs
fixtures: []
commands:
  - cd domdoc-wasm && cargo test
  - cd domdoc-wasm && cargo test --features parley-shaping
deliverables: [default_font_stack, parley optional dep, shaping_backend_id]
status: review
```

Parley layout output still delegates to flow for M0; gate **G2** **not-run** until shaped proofs exceed fallback.
