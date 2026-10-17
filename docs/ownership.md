# State ownership (W0)

See blueprint §2, §12.2 and §13.1. This repository owns all semantic mutation; sibling **domdoc-wasm** only renders immutable projections.

Web-owned (do not put in engine schema): `DocumentSession`, transactions, DOCX OPC/XML, PDF writer adapters, review ledger, components, persistence, export.

Engine-owned wire: `domdoc-wasm/schema/render-wire-v1.json` → generated `packages/core/src/wire/generated*.ts`.
