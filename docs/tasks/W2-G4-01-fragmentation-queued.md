# W2-G4-01-fragmentation-queued

```yaml
id: W2-G4-01
goal: Component measurement and semantic fragmentation (G4) after G2-LAYOUT-01 merges
requirements: [F18, F19, F20]
acceptance: [AF, N]
depends_on: [G2-LAYOUT-01, G3-INPUT-01]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-web/packages/core/src/components/**
  - domdoc-wasm/src/layout/fragmentation.rs (new, not concurrent with G2 layout edits)
forbidden_paths: [concurrent G2-LAYOUT Rust layout files]
context: [blueprint_§6]
fixtures: [C01-C04 M0 subset]
commands: [TBD after deps]
deliverables: [queued; do not dispatch until G2 layout integrated]
status: backlog
```

Blocked on G2 flow layout integration and stable session component contracts. Coordinator owns scheduling; no G2/G4 concurrent Rust layout ownership.
