#include <emscripten.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef DOMDOC_LINK_PDFIUM
#include "fpdfview.h"
#include "fpdf_edit.h"

/** Minimal fpdf_edit.h surface smoke when static lib is linkable (partial — not DomdocPdfiumApi). */
EMSCRIPTEN_KEEPALIVE int domdoc_pdfium_writer_smoke(void) {
  FPDF_LIBRARY_CONFIG config;
  config.version = 2;
  config.m_pUserFontPaths = NULL;
  config.m_pIsolate = NULL;
  config.m_v8EmbedderSlot = 0;
  config.m_pPlatform = NULL;
  FPDF_InitLibraryWithConfig(&config);
  FPDF_DOCUMENT doc = FPDF_CreateNewDocument();
  FPDF_PAGE page = FPDFPage_New(doc, 0, 612.0, 792.0);
  int ok = page != NULL ? 1 : 0;
  if (page) {
    FPDF_PAGEOBJECT text = FPDFPageObj_CreateTextObj(doc, NULL, 12.0);
    if (text) {
      static const unsigned short domdoc_smoke_text[] = {
          'd', 'o', 'm', 'd', 'o', 'c', 0,
      };
      FPDFText_SetText(text, domdoc_smoke_text);
      FPDFPage_InsertObject(page, text);
      ok = FPDFPage_GenerateContent(page) ? 1 : 0;
    }
    FPDFPage_Delete(doc, 0);
  }
  FPDF_CloseDocument(doc);
  FPDF_DestroyLibrary();
  return ok;
}

EMSCRIPTEN_KEEPALIVE const char *domdoc_pdfium_writer_glue_kind(void) {
  return "fpdf-edit-smoke-linked";
}

#else

EMSCRIPTEN_KEEPALIVE int domdoc_pdfium_contract_stub(void) {
  return 42;
}

EMSCRIPTEN_KEEPALIVE const char *domdoc_pdfium_writer_glue_kind(void) {
  return "contract-stub-unlinked";
}

#endif

#ifdef __cplusplus
}
#endif
