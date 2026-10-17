# G3-INPUT-04-playwright-smoke

```yaml
id: G3-INPUT-04
goal: Playwright minimal config + compositor canvas mount smoke (no IME gate proof)
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-03]
base_pair: { wasm_commit: ee8ddb0c1173e9f97d13c618bca8fde376343d04, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - playwright.config.ts
  - e2e/compositor-mount.spec.ts
forbidden_paths:
  - domdoc-wasm/**
fixtures: []
commands:
  - cd domdoc-web && pnpm exec playwright install chromium
  - cd domdoc-web && pnpm test:e2e
deliverables: [playwright config, compositor mount smoke spec]
status: review
```

Integrated WASM paint + IME composition against app shell remain follow-on; gate **G3** **not-run**.
