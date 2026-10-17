# G2-LAYOUT-07-font-visual-corpus

```yaml
id: G2-LAYOUT-07
goal: Font/visual corpus pkg tests — shaped JSON vs flow-fallback; optional line-break diff
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-06]
write_paths:
  - packages/core/src/formats/docx/layout-shaping-font-visual-corpus.pkg.test.ts
commands:
  - cd domdoc-wasm && node scripts/wasm-pack-parley.mjs
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-shaping-font-visual
deliverables: [LV-01..LV-03 visual corpus, parley≠flow JSON proof when pkg present]
status: review
```

Full visual/font gate proof **not-run**; gate **G2** **not-run**.
