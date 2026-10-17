# G2-DOCX-20-foreign-numbering-merge

```yaml
id: G2-DOCX-20
goal: numId / abstractNumId allocation on foreign numbering merge
requirements: [F07]
acceptance: [W-subset]
depends_on: [G2-DOCX-19]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-foreign-merge.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-foreign-merge
deliverables: [D05-DRT-12 collision reallocation; mergeForeignNumberingPart]
status: review
```

Gate **G2 not-run**.
