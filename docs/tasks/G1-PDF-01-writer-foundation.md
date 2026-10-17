# G1-PDF-01-writer-foundation

```yaml
id: G1-PDF-01
goal: Typed disposable PDF writer contract, source-map scaffolding, honest unsupported without pinned PDFium WASM
requirements: [F29, F32, F36]
acceptance: [AC, D]
depends_on: [W0-FOUNDATION]
base_pair: { wasm_commit: 9d2e8e7, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/packages/core/src/formats/pdf/**
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/evidence/gates/G1-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
  - packages/core/src/wire/generated*.ts
context: [blueprint_§3, blueprint_§13.1, blueprint_§13.5]
fixtures: [P01-classification, P11-rollback, P12-lifecycle-dispose]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/pdf
deliverables: [writer.ts, source-map.ts, stub backend, unit tests, gate-record.json status not-run]
status: ready
```

Implement `preflight`, `materialize`, `apply`, `save`, `dispose` on a generation-aware `PdfWriterSession`. Writer memory is isolated from the display engine. Until PDFium WASM is pinned (C24/C25 licence review), native replace/delete returns `unsupported` with explicit codes; tests prove rollback (P11) and dispose clears handles (P12 subset). No overlay passes as native edit.
