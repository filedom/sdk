# G2-LAYOUT-20-packet-reconciliation

```yaml
id: G2-LAYOUT-20
goal: Reconcile independent PNG review vs visual attestation packets
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-19]
write_paths:
  - packages/core/src/layout/layout-visual-packet-reconciliation.ts
  - scripts/reconcile-layout-independent-png-visual-attestation.mjs
commands:
  - cd domdoc-web && pnpm reconcile:layout-independent-png-visual-attestation
deliverables: [layout-visual-packet-reconciliation.json; not gate pass]
status: review
```

Gate **G2 not-run**.
