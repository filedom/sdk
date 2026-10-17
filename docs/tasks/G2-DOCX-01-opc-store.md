# G2-DOCX-01-opc-store

```yaml
id: G2-DOCX-01
goal: Source-preserving OPC/ZIP store with stable part identities and untouched-member round trip (D01 slice)
requirements: [F07, F08, W]
acceptance: [W, AD-subset]
depends_on: [W0-FOUNDATION]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/packages/core/src/formats/docx/**
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/evidence/gates/G2-feasibility/**
forbidden_paths:
  - domdoc-wasm/src/layout/**
context: [blueprint_§4.1, blueprint_§12.3, C01-C03 reference]
fixtures: [D01-minimal-docx, D13-oversized-reject]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/docx
deliverables: [opc-package.ts, ooxml-tree.ts, docx-store.ts, tests, fflate dependency MIT]
status: ready
```

Authoritative package keeps original member bytes, relationship index, and parsed `word/document.xml` tree with stable node IDs. Export re-serializes untouched parts identically (decompressed bytes). Edits patch through store API only; ProseMirror not introduced in this card.
