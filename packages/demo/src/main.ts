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
import { dispatchM2ToolbarCommand } from "../../core/dist/session/m2-toolbar-command-stub.js";
import { listM2ToolbarCommandRegistry } from "../../core/dist/session/m2-toolbar-command-registry.js";
import {
  createDocumentSession,
} from "../../core/dist/session/document-session.js";
import { MemoryDomdocBlobStoreStub } from "../../core/dist/persistence/domdoc-package-stub.js";
import { exportDocxFromStoreStub } from "../../core/dist/formats/docx/docx-export-stub.js";
import { exportDocxTrackChangesFromStoreStub } from "../../core/dist/formats/docx/docx-track-changes-export-stub.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "../../core/dist/formats/docx/review-minimal-docx-fixture.js";
import { DocxStore } from "../../core/dist/formats/docx/docx-store.js";
import { describePdfiumWasmReadPathBrowser } from "../../core/dist/formats/pdf/pdfium-wasm-read-path-stub.js";
import {
  buildDemoDocxZipBytes,
  openDocxProsemirrorDemoSessionSlice,
} from "../../core/dist/session/docx-prosemirror-demo-session-slice.js";
import {
  applyProsemirrorDemoEditWithToolbarUndo,
  createProsemirrorDemoToolbarUndoState,
  undoProsemirrorDemoViaToolbar,
} from "../../core/dist/session/prosemirror-demo-toolbar-undo-bridge.js";
import { proseMirrorParagraphTexts } from "../../core/dist/formats/docx/docx-prosemirror-projection.js";
import {
  loadProsemirrorDemoDomdocPackageStub,
  saveProsemirrorDemoDomdocPackageStub,
} from "../../core/dist/session/docx-prosemirror-domdoc-package-stub.js";
import { tryLoadPdfiumLibProbeRender } from "../../core/dist/formats/pdf/pdfium-lib-probe-render-stub.js";
import {
  buildAnnotationsWireStubFromOpcMembers,
  listAnnotationWireStubLabels,
} from "../../core/dist/formats/docx/annotations-wire-stub.js";
import { domdocReactAdapterDemoSurface } from "@domdoc/react";
import { domdocVueAdapterDemoSurface } from "@domdoc/vue";
import { domdocLitAdapterDemoSurface } from "@domdoc/lit";
import { domdocAngularAdapterDemoSurface } from "@domdoc/angular";
import { domdocSvelteAdapterDemoSurface } from "@domdoc/svelte";
import { domdocPreactAdapterDemoSurface } from "@domdoc/preact";
import { domdocSolidAdapterDemoSurface } from "@domdoc/solid";

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
  if (params.get("g1PdfiumProbePageRender") === "1") {
    document.body.dataset.g1PdfiumProbePageRenderRequested = "true";
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
  const sessionStub = {
    documentId: "demo-sess",
    kind: "flow" as const,
    revisions: {
      committedRevision: 0,
      persistedRevision: 0,
      materializedRevision: 0,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 0,
    },
  };
  let pmSlice = openDocxProsemirrorDemoSessionSlice(buildDemoDocxZipBytes("domdoc"), sessionStub);
  let pmUndoState = createProsemirrorDemoToolbarUndoState(pmSlice);
  const syncToolbarStackDataset = (): void => {
    document.body.dataset.m2ToolbarUndoDepth = String(pmUndoState.toolbarStack.undoDepth);
    document.body.dataset.m2ToolbarRedoDepth = String(pmUndoState.toolbarStack.redoDepth);
    document.body.dataset.m2ToolbarLastCommand = pmUndoState.toolbarStack.lastCommand ?? "";
  };
  const pmInput = document.getElementById("domdoc-prosemirror-edit");
  const syncProsemirrorDemoDataset = (): void => {
    document.body.dataset.m1ProsemirrorSlice = "true";
    document.body.dataset.m1ProsemirrorRevision = String(
      pmSlice.session.revisions.committedRevision,
    );
    document.body.dataset.m1ProsemirrorParagraph = proseMirrorParagraphTexts(pmSlice.doc)[0] ?? "";
    if (pmInput instanceof HTMLInputElement) {
      pmInput.value = proseMirrorParagraphTexts(pmSlice.doc)[0] ?? "";
    }
  };
  if (toolbar) {
    document.body.dataset.m2ToolbarShell = "stub";
    document.body.dataset.m2ToolbarSessionId = "demo-sess";
    document.body.dataset.m2ToolbarRegistryCount = String(listM2ToolbarCommandRegistry().length);
    syncToolbarStackDataset();
    const saveBtn = document.getElementById("domdoc-toolbar-save-stub");
    const undoBtn = document.getElementById("domdoc-toolbar-undo-stub");
    saveBtn?.addEventListener("click", () => {
      const result = dispatchM2ToolbarCommand(pmUndoState.toolbarStack, "save-stub");
      pmUndoState = { ...pmUndoState, toolbarStack: result.stack };
      syncToolbarStackDataset();
      document.body.dataset.m2ToolbarSaveOk = result.ok ? "true" : "false";
      const session = createDocumentSession({
        ...sessionStub,
        revisions: {
          ...sessionStub.revisions,
          committedRevision: pmUndoState.toolbarStack.undoDepth,
          persistedRevision: pmUndoState.toolbarStack.undoDepth,
          materializedRevision: pmUndoState.toolbarStack.undoDepth,
          renderedRevision: pmUndoState.toolbarStack.undoDepth,
        },
      });
      const store = new MemoryDomdocBlobStoreStub();
      const saved = session.saveDomdocPackageStubToStore(store);
      document.body.dataset.m2DomdocSaveOk = saved.simulation.ok ? "true" : "false";
      document.body.dataset.m2DomdocMemberCount = String(store.blobs.size);
    });
    undoBtn?.addEventListener("click", () => {
      const undone = undoProsemirrorDemoViaToolbar(pmSlice, pmUndoState, 0);
      pmSlice = undone.slice;
      pmUndoState = undone.undoState;
      syncToolbarStackDataset();
      syncProsemirrorDemoDataset();
      document.body.dataset.m2ToolbarUndoOk = undone.toolbarDispatch.ok ? "true" : "false";
      document.body.dataset.m1ProsemirrorToolbarUndoBound = "true";
    });
  }
  if (sessionLabel) {
    sessionLabel.textContent = "Session: demo-sess (M2 stub)";
    document.body.dataset.m2SessionLabel = sessionLabel.textContent;
    document.body.dataset.m2SessionId = "demo-sess";
  }

  pmUndoState = createProsemirrorDemoToolbarUndoState(pmSlice);
  syncProsemirrorDemoDataset();
  const openInput = document.getElementById("domdoc-open-local");
  if (openInput instanceof HTMLInputElement) {
    openInput.addEventListener("change", () => {
      const file = openInput.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then((buffer) => {
        try {
          const bytes = new Uint8Array(buffer);
          pmSlice = openDocxProsemirrorDemoSessionSlice(bytes, sessionStub);
          pmUndoState = createProsemirrorDemoToolbarUndoState(pmSlice);
          syncProsemirrorDemoDataset();
          syncToolbarStackDataset();
          document.body.dataset.f01OpenOk = "true";
          document.body.dataset.f01OpenKind = "docx";
          document.body.dataset.f01OpenBytes = String(bytes.byteLength);
        } catch (error) {
          document.body.dataset.f01OpenOk = "false";
          document.body.dataset.f01OpenError = String(error);
        }
      });
    });
  }
  const domdocStore = new MemoryDomdocBlobStoreStub();
  const domdocSaved = saveProsemirrorDemoDomdocPackageStub(pmSlice, domdocStore);
  document.body.dataset.m1DomdocPackageSaveOk = domdocSaved.simulation.ok ? "true" : "false";
  const domdocReopened = loadProsemirrorDemoDomdocPackageStub(domdocSaved.packageZipBytes);
  document.body.dataset.m1DomdocPackageRoundTripOk = domdocReopened ? "true" : "false";
  void Promise.all([tryLoadPdfiumLibProbeRender(), describePdfiumWasmReadPathBrowser()]).then(
    ([probe, readPath]) => {
      document.body.dataset.g1PdfiumProbeRender = probe.moduleLoaded ? "loaded" : "absent";
      document.body.dataset.g1PdfiumProbePresent = probe.probePresent ? "true" : "false";
      document.body.dataset.g1PdfiumReadPathLoaded = readPath.moduleLoaded ? "true" : "false";
      document.body.dataset.g1PdfiumWriterExportsReady = readPath.writerExportsReady ? "true" : "false";
      document.body.dataset.g1PdfiumProbePageBitmapBytes = probe.moduleLoaded ? "4" : "0";
      document.body.dataset.g1PdfiumProbePageBitmapSynthetic = probe.moduleLoaded ? "true" : "false";
      if (params.get("g1PdfiumProbePageRender") === "1") {
        document.body.dataset.g1PdfiumProbePageRenderHint =
          "node-worker:612x792-when-vendor-present";
      }
      if (params.get("g1PdfiumProbeWorker") === "1") {
        document.body.dataset.g1PdfiumProbeWorkerStatus =
          probe.moduleLoaded ? "probe-render-loaded" : probe.error ?? "probe-absent";
      }
    },
  );
  const reactSurface = domdocReactAdapterDemoSurface("demo-sess");
  document.body.dataset.m5ReactAdapter = reactSurface.surface;
  document.body.dataset.m5ReactSessionId = reactSurface.sessionId;
  const vueSurface = domdocVueAdapterDemoSurface("demo-sess");
  document.body.dataset.m5VueAdapter = vueSurface.surface;
  document.body.dataset.m5VueSessionId = vueSurface.sessionId;
  const litSurface = domdocLitAdapterDemoSurface("demo-sess");
  document.body.dataset.m5LitAdapter = litSurface.surface;
  document.body.dataset.m5LitSessionId = litSurface.sessionId;
  const angularSurface = domdocAngularAdapterDemoSurface("demo-sess");
  document.body.dataset.m5AngularAdapter = angularSurface.surface;
  document.body.dataset.m5AngularSessionId = angularSurface.sessionId;
  const svelteSurface = domdocSvelteAdapterDemoSurface("demo-sess");
  document.body.dataset.m5SvelteAdapter = svelteSurface.surface;
  document.body.dataset.m5SvelteSessionId = svelteSurface.sessionId;
  if (params.get("m5Extended") !== "0") {
    const preactSurface = domdocPreactAdapterDemoSurface("demo-sess");
    document.body.dataset.m5PreactAdapter = preactSurface.surface;
    document.body.dataset.m5PreactSessionId = preactSurface.sessionId;
    const solidSurface = domdocSolidAdapterDemoSurface("demo-sess");
    document.body.dataset.m5SolidAdapter = solidSurface.surface;
    document.body.dataset.m5SolidSessionId = solidSurface.sessionId;
  }

  const commentsMembers = new Map<string, Uint8Array>();
  commentsMembers.set(
    "word/comments.xml",
    new TextEncoder().encode(
      `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="Reviewer"/><w:comment w:id="1" w:author="Author" w:parentId="0"/></w:comments>`,
    ),
  );
  const annotationsWire = buildAnnotationsWireStubFromOpcMembers(commentsMembers);
  const commentsList = document.getElementById("domdoc-comments-list");
  if (commentsList) {
    for (const label of listAnnotationWireStubLabels(annotationsWire)) {
      const li = document.createElement("li");
      li.textContent = label;
      commentsList.appendChild(li);
    }
  }
  document.body.dataset.m5CommentsWireCount = String(annotationsWire.comments.commentCount);
  document.body.dataset.m5CommentsThreadCount = String(annotationsWire.reviewThreads.length);

  const trackedStore = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
  const trackedExport = exportDocxTrackChangesFromStoreStub(trackedStore, pmSlice.session);
  document.body.dataset.m4DocxTrackChangesExportOk = trackedExport.result.trackedMarkersPreserved
    ? "true"
    : "false";
  if (pmInput instanceof HTMLInputElement) {
    pmInput.addEventListener("change", () => {
      const current = proseMirrorParagraphTexts(pmSlice.doc)[0] ?? "";
      if (pmInput.value === current) return;
      const edited = applyProsemirrorDemoEditWithToolbarUndo(pmSlice, pmUndoState, 0, pmInput.value);
      pmSlice = edited.slice;
      pmUndoState = edited.undoState;
      syncToolbarStackDataset();
      syncProsemirrorDemoDataset();
      document.body.dataset.m1ProsemirrorToolbarUndoBound = "true";
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
