# F01-OPEN-01-local-docx-picker

```yaml
id: F01-OPEN-01
goal: Local file picker opens a DOCX into the demo ProseMirror session
requirements: [F01]
acceptance: [A-subset]
depends_on: [G2-DOCX-03]
write_paths:
  - packages/demo/index.html
  - packages/demo/src/main.ts
  - e2e/demo-shell.spec.ts
  - e2e/fixtures/minimal-open.docx
commands:
  - cd domdoc-web && pnpm test:e2e
deliverables: [#domdoc-open-local; data-f01-open-ok]
status: review
```

URL/drop/password paths remain unfinished.
