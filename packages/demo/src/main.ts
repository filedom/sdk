import init, * as engine from "@domdoc/demo-engine";
import {
  createCompositorInputState,
  pointerDownWithCaret,
} from "../../core/dist/compositor/input-hook.js";
import {
  beginComposition,
  commitComposition,
  updateCompositionPreedit,
} from "../../core/dist/editing/composition-stub.js";
import {
  afCorpusAllConverged,
  evaluateAfBrowserCorpus,
} from "../../core/dist/components/fragmentation-af-browser-corpus.js";
import { buildAfBrowserPostEditGateGradeEvidence } from "../../core/dist/components/fragmentation-af-browser-post-edit-gate-grade.js";
import { createWasmShapedLayoutHook } from "../../core/dist/layout/wasm-shaped-layout-hook.js";
import type { RenderWireResponse } from "../../core/dist/wire/generated-response.js";
import {
  createM2ToolbarUndoStackStub,
  dispatchM2ToolbarCommand,
} from "../../core/dist/session/m2-toolbar-command-stub.js";
import {
  createDocumentSession,
} from "../../core/dist/session/document-session.js";
import { MemoryDomdocBlobStoreStub } from "../../core/dist/persistence/domdoc-package-stub.js";
import { exportDocxFromStoreStub } from "../../core/dist/formats/docx/docx-export-stub.js";
import {
  applyDemoProsemirrorTextReplace,
  buildDemoDocxZipBytes,
  openDocxProsemirrorDemoSessionSlice,
} from "../../core/dist/session/docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../../core/dist/formats/docx/docx-prosemirror-projection.js";
import {
  loadProsemirrorDemoDomdocPackageStub,
  saveProsemirrorDemoDomdocPackageStub,
} from "../../core/dist/session/docx-prosemirror-domdoc-package-stub.js";
import { tryLoadPdfiumLibProbeRender } from "../../core/dist/formats/pdf/pdfium-lib-probe-render-stub.js";

const sampleProjection = () => ({
  header: {
    protocolVersion: 1,
    schemaId: "domdoc://render-wire/v1",
    requestId: "demo-req",
    sessionId: "demo-sess",
    documentGeneration: 1,
    units: "pt",
  },
  pages: [
    {
      pageIndex: 0,
      widthPt: 612,
      heightPt: 792,
      runs: [
        {
          runId: "run-demo",
          text: "domdoc",
          xPt: 72,
          yPt: 720,
          fontSizePt: 12,
        },
      ],
    },
  ],
});

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (params.get("g1PdfiumProbeWorker") === "1") {
    document.body.dataset.g1PdfiumProbeWorkerRequested = "true";
  }
  await init();
  const canvas = document.getElementById("domdoc-canvas");
  const imeInput = document.getElementById("domdoc-ime-input");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("canvas missing");
  }
  if (!(imeInput instanceof HTMLInputElement)) {
    throw new Error("ime input missing");
  }
  document.body.dataset.compositorMounted = "true";
  const toolbar = document.getElementById("domdoc-toolbar");
  const sessionLabel = document.getElementById("domdoc-session-label");
  let toolbarStack = createM2ToolbarUndoStackStub();
  const syncToolbarStackDataset = (): void => {
    document.body.dataset.m2ToolbarUndoDepth = String(toolbarStack.undoDepth);
    document.body.dataset.m2ToolbarRedoDepth = String(toolbarStack.redoDepth);
    document.body.dataset.m2ToolbarLastCommand = toolbarStack.lastCommand ?? "";
  };
  if (toolbar) {
    document.body.dataset.m2ToolbarShell = "stub";
    document.body.dataset.m2ToolbarSessionId = "demo-sess";
    syncToolbarStackDataset();
    const saveBtn = document.getElementById("domdoc-toolbar-save-stub");
    const undoBtn = document.getElementById("domdoc-toolbar-undo-stub");
    saveBtn?.addEventListener("click", () => {
      const result = dispatchM2ToolbarCommand(toolbarStack, "save-stub");
      toolbarStack = result.stack;
      syncToolbarStackDataset();
      document.body.dataset.m2ToolbarSaveOk = result.ok ? "true" : "false";
      const session = createDocumentSession({
        documentId: "demo-sess",
        kind: "flow",
        revisions: {
          committedRevision: toolbarStack.undoDepth,
          persistedRevision: toolbarStack.undoDepth,
          materializedRevision: toolbarStack.undoDepth,
          exportedRevision: 0,
          sharedRevision: null,
          renderedRevision: toolbarStack.undoDepth,
        },
      });
      const store = new MemoryDomdocBlobStoreStub();
      const saved = session.saveDomdocPackageStubToStore(store);
      document.body.dataset.m2DomdocSaveOk = saved.simulation.ok ? "true" : "false";
      document.body.dataset.m2DomdocMemberCount = String(store.blobs.size);
    });
    undoBtn?.addEventListener("click", () => {
      const result = dispatchM2ToolbarCommand(toolbarStack, "undo-stub");
      toolbarStack = result.stack;
      syncToolbarStackDataset();
      document.body.dataset.m2ToolbarUndoOk = result.ok ? "true" : "false";
    });
  }
  if (sessionLabel) {
    sessionLabel.textContent = "Session: demo-sess (M2 stub)";
    document.body.dataset.m2SessionLabel = sessionLabel.textContent;
    document.body.dataset.m2SessionId = "demo-sess";
  }

  let pmSlice = openDocxProsemirrorDemoSessionSlice(buildDemoDocxZipBytes("domdoc"), {
    documentId: "demo-sess",
    kind: "flow",
    revisions: {
      committedRevision: 0,
      persistedRevision: 0,
      materializedRevision: 0,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 0,
    },
  });
  const pmInput = document.getElementById("domdoc-prosemirror-edit");
  const syncProsemirrorDemoDataset = (): void => {
    document.body.dataset.m1ProsemirrorSlice = "true";
    document.body.dataset.m1ProsemirrorRevision = String(
      pmSlice.session.revisions.committedRevision,
    );
    document.body.dataset.m1ProsemirrorParagraph = proseMirrorParagraphTexts(pmSlice.doc)[0] ?? "";
  };
  syncProsemirrorDemoDataset();
  const domdocStore = new MemoryDomdocBlobStoreStub();
  const domdocSaved = saveProsemirrorDemoDomdocPackageStub(pmSlice, domdocStore);
  document.body.dataset.m1DomdocPackageSaveOk = domdocSaved.simulation.ok ? "true" : "false";
  const domdocReopened = loadProsemirrorDemoDomdocPackageStub(domdocSaved.packageZipBytes);
  document.body.dataset.m1DomdocPackageRoundTripOk = domdocReopened ? "true" : "false";
  void tryLoadPdfiumLibProbeRender().then((probe) => {
    document.body.dataset.g1PdfiumProbeRender = probe.moduleLoaded ? "loaded" : "absent";
    document.body.dataset.g1PdfiumProbePresent = probe.probePresent ? "true" : "false";
  });
  if (pmInput instanceof HTMLInputElement) {
    pmInput.addEventListener("change", () => {
      pmSlice = applyDemoProsemirrorTextReplace(pmSlice, 0, pmInput.value);
      syncProsemirrorDemoDataset();
      const exported = exportDocxFromStoreStub(pmSlice.store, pmSlice.session);
      pmSlice = { ...pmSlice, session: exported.session };
      document.body.dataset.m1DocxExportBytes = String(exported.result.zipBytes.length);
      document.body.dataset.m1DocxExportRevision = String(exported.result.exportedRevision);
    });
  }

  const response = JSON.parse(
    engine.render_projection_json(JSON.stringify(sampleProjection())),
  ) as RenderWireResponse;
  document.body.dataset.engineReady = "true";
  document.body.dataset.paintItems = String(response.paint?.items?.length ?? 0);

  const runText = "domdoc";
  let input = createCompositorInputState(response);
  input = pointerDownWithCaret(input, { xPt: 80, yPt: 720 }, response, runText);
  document.body.dataset.inputHookReady = input.active ? "true" : "false";
  document.body.dataset.caretOffset = String(input.active?.caretOffset ?? 0);

  const layoutInput = {
    paragraph_id: "demo-p",
    text: "layout stability probe",
    max_width_pt: 180,
    font_size_pt: 12,
  };
  const passA = engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput));
  const passB = engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput));
  document.body.dataset.layoutStable = passA === passB ? "true" : "false";
  document.body.dataset.shapingBackend = engine.layout_shaping_backend_id();

  const afVerdicts = evaluateAfBrowserCorpus((payload) =>
    engine.layout_flow_paragraph_shaped_json(payload),
  );
  document.body.dataset.afCorpusCount = String(afVerdicts.length);
  document.body.dataset.afCorpusConverged = afCorpusAllConverged(afVerdicts) ? "true" : "false";

  const wasmHook = createWasmShapedLayoutHook(engine);
  const layoutIncrementalWithPreEdit = (
    paragraphPayload: string,
    breakAfterCharIndex: number,
    preEditText: string,
  ) => {
    const paragraph = JSON.parse(paragraphPayload) as Record<string, unknown>;
    if (typeof engine.layout_flow_paragraph_incremental_json !== "function") {
      return engine.layout_flow_paragraph_shaped_json(
        JSON.stringify({ ...paragraph, text: preEditText }),
      );
    }
    return String(
      engine.layout_flow_paragraph_incremental_json(
        JSON.stringify({ paragraph, breakAfterCharIndex, preEditText }),
      ),
    );
  };
  const postEditEvidence = buildAfBrowserPostEditGateGradeEvidence(
    wasmHook.shapedLayoutJson,
    layoutIncrementalWithPreEdit,
    {
      incrementalEnginePath: wasmHook.incrementalEnginePath,
      proofPath: "browser-demo-wasm",
      breakpointsPerEntry: 3,
    },
  );
  document.body.dataset.afPostEditScaleCard = postEditEvidence.card;
  document.body.dataset.afPostEditBreakpointsPerEntry = String(postEditEvidence.breakpointsPerEntry);
  document.body.dataset.afPostEditAllEquivalent = postEditEvidence.scaledPostEditAllEquivalent
    ? "true"
    : "false";
  document.body.dataset.afPostEditAuthoritativeGate = postEditEvidence.authoritativeGatePath;

  let composition = input.active
    ? beginComposition(input.active, "")
    : null;

  imeInput.addEventListener("compositionstart", () => {
    if (!input.active) return;
    composition = beginComposition(input.active, "");
    document.body.dataset.compositionState = "active";
  });
  imeInput.addEventListener("compositionupdate", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    document.body.dataset.compositionPreedit = composition.preedit;
  });
  imeInput.addEventListener("compositionend", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    const committed = commitComposition(composition);
    input = { ...input, active: committed.region };
    document.body.dataset.compositionState = "committed";
    document.body.dataset.caretOffset = String(committed.region.caretOffset);
    document.body.dataset.compositionInserted = String(committed.insertedLength);
  });

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "14px system-ui";
    ctx.fillText(`paint items: ${response.paint?.items?.length ?? 0}`, 16, 24);
    ctx.fillText(`caret: ${input.active?.caretOffset ?? 0}`, 16, 44);
  }
}

boot().catch((err) => {
  document.body.dataset.engineReady = "error";
  document.body.dataset.engineError = err instanceof Error ? err.message : String(err);
});
