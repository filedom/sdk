# G1-PDF-03-vendored-pdfium-wasm

```yaml
id: G1-PDF-03
goal: Document vendored PDFium WASM fetch/build path; CI stub; test module-missing vs loaded-unimplemented backend paths
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-02]
base_pair: { wasm_commit: 4b2e3e7755eaad3bc190825449a38ea9936df0f2, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/formats/pdf/**
  - docs/pdfium-wasm-pin.md
  - scripts/fetch-pdfium-wasm-stub.mjs
  - evidence/gates/G1-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
fixtures: [P01-P05-classification-not-run]
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm-stub
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/pdf
deliverables: [fetch stub script, pin doc build path, dual-path backend tests]
status: review
```

Gate **G1** remains **not-run** until P01–P05 pass on vendored PDFium WASM in CI.
