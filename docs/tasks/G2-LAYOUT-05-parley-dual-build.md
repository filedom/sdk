# G2-LAYOUT-05-parley-dual-build

```yaml
id: G2-LAYOUT-05
goal: Optional parley-shaping WASM pkg path + dual-build docs; node parley backend test when pkg built
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-04]
write_paths:
  - domdoc-wasm/scripts/wasm-pack-parley.mjs
  - domdoc-wasm/docs/parley-dual-build.md
  - packages/core/src/formats/docx/layout-shaping-parley.pkg.test.ts
commands:
  - cd domdoc-wasm && node scripts/wasm-pack-parley.mjs
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-shaping-parley
deliverables: [pkg-node-parley optional build, dual-build doc]
status: review
```

Default `@domdoc/core` dependency remains **flow-fallback**; gate **G2** **not-run**.
