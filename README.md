# domdoc-web

TypeScript workspace for domdoc authoritative state, codecs, UI, and host adapters.

W0 includes `@domdoc/core` with a minimal engine worker handshake against sibling **domdoc-wasm**.

## Commands

```bash
pnpm install
pnpm generate:wire-types
pnpm build
pnpm test
```

Build **domdoc-wasm** (`wasm-pack build --target nodejs`) before running tests.
