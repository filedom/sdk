# C24 writer Emscripten link plan (sibling GN rejected)

Upstream Chromium PDFium **does not** support `target_os=wasm` in GN. Production `domdoc-pdfium-wasm` uses a **separate Emscripten pipeline**:

| Stage | Location | Output |
| --- | --- | --- |
| pdfium-lib Emscripten PDFium | `domdoc-pdfium-wasm/third_party/pdfium-lib` → `build/emscripten/wasm/release/lib/libpdfium.a` | Static archive + `include/` |
| Domdoc glue | `build/domdoc_pdfium_writer_glue.c` (+ optional `fpdf_edit.h` smoke) | `_domdoc_pdfium_writer_smoke` |
| Full writer | `domdoc-pdfium-wasm/src/custom.cpp` + `exported-functions.json` | `dist/domdoc_pdfium.js` + `.wasm` |

## In-repo contract package (`packages/domdoc-pdfium-wasm`)

| Script | Role |
| --- | --- |
| `build/attempt-gclient-host-ninja.sh` | Bounded `ninja pdfium` on **host** gclient `out/`; records artifact paths |
| `build/emcc-link-writer.sh` | Links glue against `PDFIUM_STATIC_LIB` when present; else contract stub only |
| `scripts/build-from-gclient.sh` | Orchestrates gclient attempt + emcc link + manifest |

Set `PDFIUM_STATIC_LIB` to `libpdfium.a` from pdfium-lib Emscripten release or from gclient host `out/Release/obj/libpdfium.a` when linkable.

**Honest gate:** `c24WriterExports: false` until `domdoc-pdfium-wasm/dist` production drop loads `DomdocPdfiumApi`.
