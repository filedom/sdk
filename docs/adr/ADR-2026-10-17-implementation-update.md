# ADR: Implementation update (17 Oct 2026)

## Status

Accepted (incremental slice; gates remain not-run unless evidence exists).

## Context

The implementation update prompt requires format-level lazy loading, improved container detection (PDF/DOCX/.domdoc/legacy DOC vs encrypted OOXML), F165 legacy DOC import, and preserved TS-owned session vs Rust display ownership — without a Go runtime or second editing authority.

## Decision

1. **Keep** domdoc-web `DocumentSession` and domdoc-wasm read-only display/layout (no edit/save in Rust).
2. **Add** `FormatModuleLoader` + descriptors + asset manifest stub in `@domdoc/core`; hosts register dynamic importers (demo registers docx/pdf/legacy-doc).
3. **Demo default:** lazy shell (`aoLazyShell=true`) until `?eagerEngine=1` or user opens a document; PDF preview uses **PDF.js** (display); C24 PDFium WASM remains **writer-oriented** (G1), not browser raster proof.
4. **F165:** `importLegacyDocStub` preserves bytes + loss report; rwml integration **not-run**.
5. **F02:** OLE classified as `legacy-doc` (WordDocument), `encrypted-ooxml` (EncryptedPackage), or generic unsupported.

## Consequences

- E2E regression uses `baseURL` with `eagerEngine=1`; journey AO covered by `e2e/lazy-format-loading.spec.ts`.
- Full AO/AP/AQ–AV acceptance remains **not-run** until packaged artifacts, network budgets, and native oracles exist.
- PDF writer worker deferral unchanged; `pdf-writer` module id reserved in manifest.

## Conflicts

None with master prompt ownership table. Prior demo eager WASM import conflicted with AO; resolved via lazy default + explicit preload query param.
