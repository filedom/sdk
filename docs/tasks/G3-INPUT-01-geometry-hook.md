# G3-INPUT-01-geometry-hook

```yaml
id: G3-INPUT-01
goal: Map engine geometry wire types to editable hit regions and compositor input hook (design-only proof)
requirements: [F12, F38]
acceptance: [O-subset, AE-subset]
depends_on: [W0-FOUNDATION]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/packages/core/src/editing/**
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/packages/core/src/compositor/**
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-web/evidence/gates/G3-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
context: [blueprint_§5.1, blueprint_§12.2 compositor row]
fixtures: [I10-focus-retained-mock-geometry]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/editing
deliverables: [geometry-map.ts, input-region.ts, compositor/input-hook.ts, vitest]
status: ready
```

Cannot claim G3 pass until browser IME/integrated paint runs; this card wires stable `GeometryBundle` → pointer hit → active region selection against mock engine responses.
