# G3-INPUT-02-browser-spike

```yaml
id: G3-INPUT-02
goal: Minimal happy-dom compositor pointer spike (not G3 gate proof)
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-01]
write_paths:
  - packages/core/src/compositor/**
  - packages/core/vitest.config.ts
fixtures: [browser-canvas-pointer-scale]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test
status: review
```

Playwright/full browser IME remains future work; this card only proves DOM-scale → point mapping with the input hook.
