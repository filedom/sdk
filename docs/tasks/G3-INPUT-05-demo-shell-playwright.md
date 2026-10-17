# G3-INPUT-05-demo-shell-playwright

```yaml
id: G3-INPUT-05
goal: Minimal Vite demo shell loading compositor + browser WASM paint; extend Playwright beyond canvas-only smoke
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-04]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/demo/**
  - e2e/demo-shell.spec.ts
  - playwright.config.ts
forbidden_paths:
  - domdoc-wasm/**
fixtures: []
commands:
  - cd domdoc-web && pnpm install
  - cd domdoc-web && pnpm exec playwright install chromium
  - cd domdoc-web && pnpm test:e2e
deliverables: [@domdoc/demo vite shell, wasm paint e2e]
status: review
```

IME and full integrated editing remain follow-on; gate **G3** **not-run**.
