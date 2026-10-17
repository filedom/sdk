# G3-INPUT-06-ime-caret-demo

```yaml
id: G3-INPUT-06
goal: IME/composition Playwright subset + manual test plan; caret-integrated demo shell
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-05]
write_paths:
  - packages/demo/**
  - e2e/demo-caret-composition.spec.ts
  - docs/ime-composition-manual-test.md
commands:
  - cd domdoc-web && pnpm test:e2e
deliverables: [caret dataset, composition events, manual IME checklist]
status: review
```

Real OS IME **not-run** in CI; gate **G3** **not-run**.
