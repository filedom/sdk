# Export policy (M1 stub)

Documents the three export modes from blueprint §7. **Gate G5 not-run** — this file is policy only; no release claims.

| Policy | Package contents | Native checkpoint | Use |
| --- | --- | --- | --- |
| **domdoc-package** | `.domdoc` ZIP with manifest, source/, state/, assets/, fallbacks/ | Optional embedded native checkpoint bytes | Default M1 reopen stub (`exportPolicy: "domdoc-package"` in manifest) |
| **enhanced-native** | Native OPC/PDF with domdoc sidecar diagnostics | Authoritative native bytes + revision ledger | Not implemented in M1 slice |
| **portable-native** | Native file only | Same as enhanced without domdoc envelope | Not implemented in M1 slice |

Crash-safe local persist ordering is defined in `DOMDOC_CRASH_SAFE_COMMIT_STEPS` (blob verify before manifest commit). Export and persist are separate revision receipts (blueprint §13.1).
