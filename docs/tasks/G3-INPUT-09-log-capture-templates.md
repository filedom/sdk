# G3-INPUT-09-log-capture-templates

```yaml
id: G3-INPUT-09
goal: Platform IME/SR log capture templates + validator tests (synthetic logs labeled)
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-08]
write_paths:
  - packages/core/src/input/input-evidence-log-templates.ts
  - packages/core/src/input/input-evidence-log-templates.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-log
deliverables: [IME_LOG_CAPTURE_TEMPLATES, validateCapturedImeLog]
status: review
```

Real platform IME/SR capture **not-run**; gate **G3** **not-run**.
