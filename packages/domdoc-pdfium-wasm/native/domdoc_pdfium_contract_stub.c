#include <emscripten.h>

/** Minimal Emscripten artifact for CI/toolchain smoke — not linked to PDFium. */
EMSCRIPTEN_KEEPALIVE int domdoc_pdfium_contract_stub(void) {
  return 42;
}
