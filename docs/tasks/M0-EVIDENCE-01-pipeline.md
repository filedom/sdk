# M0-EVIDENCE-01-pipeline

```yaml
id: M0-EVIDENCE-01
goal: Feature registry stub, qa:gates hook, per-gate feasibility evidence directories
requirements: [F49, S]
depends_on: [W0-FOUNDATION]
base_pair: { wasm_commit: TBD, web_commit: TBD }
write_paths:
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/docs/feature-registry.json
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/scripts/qa-*.mjs
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/evidence/gates/**
context: [blueprint_§7.2, blueprint_§12.8, blueprint_§12.9]
fixtures: []
commands:
  - cd domdoc-web && pnpm qa:gates -- --scope feasibility
  - cd domdoc-web && pnpm qa:docs
deliverables: [feature-registry.json, gate JSON records, qa scripts returning incomplete not-run]
status: ready
```

Records bind gate ID, commits, contract hash, required fixture IDs and `status: not-run` until real proofs land. Never fabricate pass.
