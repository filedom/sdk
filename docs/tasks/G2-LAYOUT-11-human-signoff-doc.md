# G2-LAYOUT-11-human-signoff-doc

```yaml
id: G2-LAYOUT-11
goal: Document optional human visual baseline sign-off (distinct from checksum CI)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-10]
write_paths:
  - docs/layout-visual-human-signoff.md
commands:
  - cd domdoc-web && pnpm qa:docs
deliverables: [human sign-off workflow doc; honest no-human-available note]
status: review
```

Human visual review **not performed**; gate **G2 not-run**.
