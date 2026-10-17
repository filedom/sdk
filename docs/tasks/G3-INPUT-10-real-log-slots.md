# G3-INPUT-10-real-log-slots

```yaml
id: G3-INPUT-10
goal: Real IME/SR log slots + validator; document platform capture steps
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-09]
write_paths:
  - packages/core/src/input/input-evidence-real-log-slots.ts
  - evidence/gates/G3-feasibility/ime-sr-real-log-slots.json
  - docs/ime-sr-platform-capture.md
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-real
deliverables: [REAL_INPUT_LOG_SLOTS, validateRealPlatformInputLog, capture doc]
status: review
```

Real platform IME/SR logs **not captured**; gate **G3** **not-run**.
