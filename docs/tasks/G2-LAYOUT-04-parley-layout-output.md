# G2-LAYOUT-04-parley-layout-output

```yaml
id: G2-LAYOUT-04
goal: Wire Parley shaping into layout output when parley-shaping feature enabled; WASM font proof tests
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-03]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-wasm/src/layout/shaping.rs
  - domdoc-wasm/src/layout/flow.rs
  - domdoc-wasm/src/bindings/mod.rs
  - domdoc-wasm/tests/layout_font_proof.rs
  - domdoc-wasm/docs/layout.md
forbidden_paths:
  - domdoc-wasm/src/layout/fragmentation.rs
fixtures: []
commands:
  - cd domdoc-wasm && cargo test
  - cd domdoc-wasm && cargo test --features parley-shaping
deliverables: [shaped line metadata, layout_shaping_backend_id export, font proof tests]
status: review
```

npm/pkg-node WASM builds remain **flow-fallback**; Parley output proofs run in native `--features parley-shaping`. Gate **G2** **not-run**.
