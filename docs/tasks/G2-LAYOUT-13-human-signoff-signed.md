# G2-LAYOUT-13-human-signoff-signed

```yaml
id: G2-LAYOUT-13
goal: Human sign-off via template + signed checksum file (simulated OK if labeled)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-12]
write_paths:
  - scripts/sign-layout-human-signoff.mjs
  - evidence/gates/G2-feasibility/layout-visual-human-signoff-signed.json
  - docs/layout-visual-human-signoff.md
commands:
  - cd domdoc-web && pnpm sign:layout-human-signoff
deliverables: [simulated-signoff-labeled checksum signature]
status: review
```

Simulated signature only; gate **G2 not-run**.
