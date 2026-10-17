# G2-LAYOUT-06-shaped-flow-ci-parley-demo

```yaml
id: G2-LAYOUT-06
goal: Shaped≠flow CI proof on pinned fonts; optional demo job wired to pkg-parley
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-05]
write_paths:
  - packages/core/src/formats/docx/layout-shaping-flow-parley-diff.pkg.test.ts
  - packages/demo/vite.config.ts
  - packages/demo/package.json
forbidden_paths:
  - domdoc-wasm/src/**
commands:
  - cd domdoc-wasm && node scripts/wasm-pack-parley.mjs
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-shaping-flow-parley
  - cd domdoc-web && pnpm --filter @domdoc/demo dev:parley
deliverables: [parley-eval shaped JSON ≠ flow-fallback pkg, DOMDOC_DEMO_PARLEY demo alias]
status: review
```

Gate **G2** layout fidelity **not-run**; pkg-node default remains flow-fallback.
