# Emscripten sibling build (`domdoc-pdfium-wasm`)

Upstream Chromium PDFium **rejects** `target_os=wasm` in GN. A **macOS host** `ReleaseComplete/obj/libpdfium.a` from gclient is **Mach-O** and **cannot** be linked into browser WASM (see `dist/emcc-link-record.json` → `hostStaticLibWasmLinkAttempt`).

Production **G1 C24 writer** artifacts come from the sibling repo:

| Item | Path |
| --- | --- |
| Repo | `../domdoc-pdfium-wasm` (sibling of `domdoc-web`) |
| Entry script | `build-wasm.sh` |
| Static input | `third_party/pdfium-lib/build/emscripten/wasm/release/lib/libpdfium.a` |
| Output drop | `dist/domdoc_pdfium.js` + `dist/domdoc_pdfium.wasm` + `dist/index.js` |

## Automated steps (local)

```bash
# 1) Emscripten (once)
cd domdoc-web
git clone https://github.com/emscripten-core/emsdk.git tools/emsdk
cd tools/emsdk && ./emsdk install latest && ./emsdk activate latest

# 2) Sibling writer build (long; needs disk + network)
cd ../domdoc-pdfium-wasm
./build-wasm.sh

# 3) Ingest + proofs (domdoc-web)
cd ../domdoc-web
pnpm fetch:pdfium-wasm   # or copy dist/ → vendor/domdoc-pdfium-wasm/
PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
```

Optional env overrides for `build-wasm.sh`:

| Variable | Purpose |
| --- | --- |
| `EMSDK` | Defaults to `domdoc-web/tools/emsdk` |
| `PDFIUM_GIT_REVISION` | C24 pin (`7c55203e…`) |

## In-repo contract package (this directory)

| Script | Role |
| --- | --- |
| `build/build-wasm.sh` | Skeleton: optional sibling `build-wasm.sh` + in-repo `emcc-link-writer.sh` + evidence JSON |
| `build/attempt-gclient-host-ninja.sh` | Host ninja discovery only |
| `build/attempt-host-static-emcc-link.sh` | Honest failed emcc link against host `.a` |
| `build/emcc-link-writer.sh` | Partial **Emscripten** `fpdf_edit` smoke when pdfium-lib wasm `.a` present |
| `scripts/build-from-gclient.sh` | gclient attempt + emcc link + manifest |

**Gate honesty:** `c24WriterExports` stays **false** in this package until sibling `dist/` passes P01–P05 on a production drop. Do not set `c24WriterExports: true` from vendor probe or partial link alone.

## Display vs writer

| Track | Artifact | G1 writer? |
| --- | --- | --- |
| pdfium-lib probe zip | `vendor/pdfium-lib-probe/` + `tryLoadPdfiumLibProbeRenderNode()` | **No** (render-only) |
| Sibling C24 drop | `vendor/domdoc-pdfium-wasm/` | **Yes** when P01–P05 pass |

See [g1-pdfium-c24-unblock-runbook.md](../../../docs/g1-pdfium-c24-unblock-runbook.md) and [LINK_PLAN.md](./LINK_PLAN.md).
