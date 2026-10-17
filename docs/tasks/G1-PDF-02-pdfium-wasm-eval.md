# G1-PDF-02-pdfium-wasm-eval

```yaml
id: G1-PDF-02
goal: Evaluate and document PDFium WASM pin (C24/C25); wire pdfium-wasm backend adapter with honest unsupported until artifact vendored
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-01]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/formats/pdf/**
  - docs/pdfium-wasm-pin.md
  - docs/licences-inventory.md
  - evidence/gates/G1-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
fixtures: [P01-P05-classification-not-run, P11, P12]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/pdf
deliverables: [pdfium-pin.ts, pdfium-wasm-backend.ts, feasibility tests, licence doc]
status: review
```

Gate **G1** remains **not-run** until P01–P05 pass on vendored PDFium WASM in CI.
