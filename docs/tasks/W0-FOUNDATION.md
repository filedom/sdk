# W0-FOUNDATION

```yaml
id: W0-FOUNDATION
goal: Freeze render wire v1 and prove WASM loads from @domdoc/core worker/direct client
requirements: [F01, F02, Q]
depends_on: []
base_pair: { wasm_commit: 9d2e8e7, web_commit: 3fca5a4 }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-wasm/schema/**
  - domdoc-wasm/src/**
  - domdoc-web/packages/core/src/wire/**
  - domdoc-web/packages/core/src/rendering/**
read_only_paths: []
context: [blueprint_§2, blueprint_§12.2, blueprint_§12.3, domdoc-wasm/docs/protocol.md]
fixtures: []
commands:
  - cd domdoc-wasm && cargo test
  - cd domdoc-wasm && wasm-pack build --target nodejs --out-dir pkg-node --out-name domdoc_engine
  - cd domdoc-web && pnpm install && pnpm build && pnpm test
deliverables: [schema, stub render, generated TS wire types, engine client + worker handshake]
status: integrated
```

W0 established engine-owned `render-wire-v1` projection/response schemas, stub paint/geometry in Rust, and web `createEngineClient` with optional Node worker. Web domain types remain in `domain-owned.ts`; generated bindings are not hand-edited. Gates G1–G6 remain **not-run**; this card records the integration baseline only.
