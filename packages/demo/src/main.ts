import "../../shell-ui/src/styles.css";
import init, * as engine from "@domdoc/demo-engine";
import { mountDomdocShell } from "@domdoc/shell-ui";
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
import { createDocumentSession } from "../../core/dist/session/document-session.js";
import {
  createDomdocPackagePersistPlanStub,
  MemoryDomdocBlobStoreStub,
  serializeDomdocPackageManifestStub,
} from "../../core/dist/persistence/domdoc-package-stub.js";
import { LAZY_FEATURE_MANIFEST_STUB } from "../../core/dist/session/lazy-feature-manifest-stub.js";
import { describeDomdocDemoExportPath } from "../../core/dist/persistence/domdoc-export-path-selection.js";
import {
  exportDocxTrackChangesFromStoreStub,
  readDocxTrackChangesMarkerSnapshot,
} from "../../core/dist/formats/docx/docx-track-changes-export-stub.js";
import { readOpcPackage } from "../../core/dist/formats/docx/opc-package.js";
import { dispatchProsemirrorDemoRejectSuggestionStub } from "../../core/dist/session/prosemirror-demo-reject-suggestion-stub.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "../../core/dist/formats/docx/review-minimal-docx-fixture.js";
import { DocxStore } from "../../core/dist/formats/docx/docx-store.js";
import { describePdfiumWasmReadPathBrowser } from "../../core/dist/formats/pdf/pdfium-wasm-read-path-stub.js";
import {
  applyProsemirrorDemoTypingTransaction,
  createProsemirrorDemoDebouncedSaveState,
} from "../../core/dist/session/prosemirror-demo-debounced-save-stub.js";
import {
  createProsemirrorDemoToolbarUndoState,
  flushProsemirrorDemoDebouncedSaveWithToolbarUndo,
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
import { dispatchCommentPanelAcceptAction } from "../../core/dist/formats/docx/comment-panel-accept-action-stub.js";
import { domdocReactAdapterDemoSurface } from "@domdoc/react";
import { domdocVueAdapterDemoSurface } from "@domdoc/vue";
import { domdocLitAdapterDemoSurface } from "@domdoc/lit";
import { domdocAngularAdapterDemoSurface } from "@domdoc/angular";
import { domdocSvelteAdapterDemoSurface } from "@domdoc/svelte";
import { domdocPreactAdapterDemoSurface } from "@domdoc/preact";
import { domdocSolidAdapterDemoSurface } from "@domdoc/solid";
import { domdocNextHostAdapterDemoSurface } from "@domdoc/next-host";
import { domdocNuxtHostAdapterDemoSurface } from "@domdoc/nuxt-host";
import { domdocSvelteKitHostAdapterDemoSurface } from "@domdoc/sveltekit-host";
import { domdocAstroHostAdapterDemoSurface } from "@domdoc/astro-host";
import { ViewerController } from "./viewer-controller.js";

const shell = mountDomdocShell("domdoc-root");
document.body.dataset.compositorMounted = "true";
shell.statusText.textContent = "Loading layout engine…";

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (params.get("g1PdfiumProbeWorker") === "1") {
    document.body.dataset.g1PdfiumProbeWorkerRequested = "true";
  }
  if (params.get("g1PdfiumProbePageRender") === "1") {
    document.body.dataset.g1PdfiumProbePageRenderRequested = "true";
  }

  await init();

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

  const viewer = new ViewerController({
    shell,
    engine,
    sessionStub,
  });

  const resizeObserver = new ResizeObserver(() => {
    void viewer.repaint();
  });
  resizeObserver.observe(shell.dropZone);

  let pmUndoState = createProsemirrorDemoToolbarUndoState(viewer.slice);
  let pmSaveState = createProsemirrorDemoDebouncedSaveState(viewer.slice);
  let pmDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const PM_DEBOUNCE_MS = 280;
  const syncToolbarStackDataset = (): void => {
    document.body.dataset.m2ToolbarUndoDepth = String(pmUndoState.toolbarStack.undoDepth);
    document.body.dataset.m2ToolbarRedoDepth = String(pmUndoState.toolbarStack.redoDepth);
    document.body.dataset.m2ToolbarLastCommand = pmUndoState.toolbarStack.lastCommand ?? "";
  };
  const syncM3ReceiptDataset = (): void => {
    const { committedRevision, persistedRevision, exportedRevision } =
      viewer.slice.session.revisions;
    document.body.dataset.m3PersistReceiptCommitted = String(committedRevision);
    document.body.dataset.m3PersistReceiptPersisted = String(persistedRevision);
    document.body.dataset.m3ExportReceiptExported = String(exportedRevision);
    document.body.dataset.m3ExportReceiptFeature = pmSaveState.featureId;
  };
  const syncProsemirrorDemoDataset = (): void => {
    document.body.dataset.m1ProsemirrorSlice = "true";
    document.body.dataset.m1ProsemirrorRevision = String(
      viewer.slice.session.revisions.committedRevision,
    );
    document.body.dataset.m1ProsemirrorPersistedRevision = String(
      viewer.slice.session.revisions.persistedRevision,
    );
    document.body.dataset.m1ProsemirrorExportedRevision = String(
      viewer.slice.session.revisions.exportedRevision,
    );
    document.body.dataset.m1ProsemirrorDebouncedPending = pmSaveState.pendingText ? "true" : "false";
    viewer.syncProsemirrorInput();
    document.body.dataset.m1ProsemirrorToolbarUndoBound = "true";
    syncM3ReceiptDataset();
  };
  const flushProsemirrorDebouncedSave = (): void => {
    if (pmSaveState.pendingText === null) return;
    const flushed = flushProsemirrorDemoDebouncedSaveWithToolbarUndo(
      viewer.slice,
      pmUndoState,
      pmSaveState,
      0,
    );
    viewer.slice = flushed.slice;
    pmUndoState = flushed.undoState;
    pmSaveState = flushed.saveState;
    syncToolbarStackDataset();
    syncProsemirrorDemoDataset();
    document.body.dataset.m1DocxExportBytes = String(flushed.docxExportBytes);
    document.body.dataset.m1DocxExportRevision = String(
      viewer.slice.session.revisions.exportedRevision,
    );
    void viewer.renderDocx();
  };
  const scheduleProsemirrorDebouncedFlush = (): void => {
    if (pmDebounceTimer !== null) {
      clearTimeout(pmDebounceTimer);
    }
    document.body.dataset.m1ProsemirrorDebouncedPending = pmSaveState.pendingText ? "true" : "false";
    pmDebounceTimer = setTimeout(() => {
      pmDebounceTimer = null;
      flushProsemirrorDebouncedSave();
    }, PM_DEBOUNCE_MS);
  };

  document.body.dataset.m2ToolbarShell = "stub";
  document.body.dataset.m2ToolbarSessionId = "demo-sess";
  document.body.dataset.m2ToolbarRegistryCount = String(listM2ToolbarCommandRegistry().length);
  const sessionLabel = document.getElementById("domdoc-session-label");
  if (sessionLabel) {
    sessionLabel.textContent = "Session: demo-sess";
    document.body.dataset.m2SessionLabel = sessionLabel.textContent;
    document.body.dataset.m2SessionId = "demo-sess";
  }

  shell.saveButton.addEventListener("click", () => {
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

  shell.undoButton.addEventListener("click", () => {
    const undone = undoProsemirrorDemoViaToolbar(viewer.slice, pmUndoState, 0);
    viewer.slice = undone.slice;
    pmUndoState = undone.undoState;
    syncToolbarStackDataset();
    syncProsemirrorDemoDataset();
    document.body.dataset.m2ToolbarUndoOk = undone.toolbarDispatch.ok ? "true" : "false";
    void viewer.renderDocx();
  });

  pmUndoState = createProsemirrorDemoToolbarUndoState(viewer.slice);
  syncProsemirrorDemoDataset();
  syncToolbarStackDataset();

  const openLocalBytes = (bytes: Uint8Array, filename?: string, source?: string) => {
    void viewer
      .openBytes(bytes, filename)
      .then(() => {
        if (viewer.documentKind() === "docx") {
          pmUndoState = createProsemirrorDemoToolbarUndoState(viewer.slice);
          pmSaveState = createProsemirrorDemoDebouncedSaveState(viewer.slice);
          syncProsemirrorDemoDataset();
          syncToolbarStackDataset();
        }
        if (source) document.body.dataset.f01OpenSource = source;
      })
      .catch((error) => {
        document.body.dataset.g1PdfiumBrowserRender = "false";
        document.body.dataset.f01OpenError = error instanceof Error ? error.message : String(error);
      });
  };

  shell.openInput.addEventListener("change", () => {
    const file = shell.openInput.files?.[0];
    if (!file) return;
    void file.arrayBuffer().then((buffer) => {
      try {
        openLocalBytes(new Uint8Array(buffer), file.name);
      } catch (error) {
        document.body.dataset.f01OpenOk = "false";
        document.body.dataset.f01OpenError = String(error);
      } finally {
        shell.openInput.value = "";
      }
    });
  });

  shell.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    shell.dropZone.classList.add("ring-2", "ring-primary/40");
  });
  shell.dropZone.addEventListener("dragleave", () => {
    shell.dropZone.classList.remove("ring-2", "ring-primary/40");
  });
  shell.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    shell.dropZone.classList.remove("ring-2", "ring-primary/40");
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    void file.arrayBuffer().then((buffer) => {
      try {
        openLocalBytes(new Uint8Array(buffer), file.name, "drop");
      } catch (error) {
        document.body.dataset.f01OpenOk = "false";
        document.body.dataset.f01OpenError = String(error);
      }
    });
  });

  shell.searchInput.addEventListener("input", () => {
    viewer.applySearch(shell.searchInput.value);
  });

  shell.prosemirrorInput.addEventListener("input", () => {
    if (viewer.documentKind() !== "docx") return;
    const typed = applyProsemirrorDemoTypingTransaction(
      viewer.slice,
      pmSaveState,
      0,
      shell.prosemirrorInput.value,
    );
    viewer.slice = typed.slice;
    pmSaveState = typed.saveState;
    syncProsemirrorDemoDataset();
    scheduleProsemirrorDebouncedFlush();
  });
  shell.prosemirrorInput.addEventListener("change", () => {
    if (viewer.documentKind() !== "docx") return;
    if (pmDebounceTimer !== null) {
      clearTimeout(pmDebounceTimer);
      pmDebounceTimer = null;
    }
    const typed = applyProsemirrorDemoTypingTransaction(
      viewer.slice,
      pmSaveState,
      0,
      shell.prosemirrorInput.value,
    );
    viewer.slice = typed.slice;
    pmSaveState = typed.saveState;
    flushProsemirrorDebouncedSave();
  });

  const exportPath = describeDomdocDemoExportPath(params.get("m1ExportPolicy"));
  document.body.dataset.m1ExportPolicy = exportPath.policy;
  document.body.dataset.m1ExportImplemented = exportPath.implemented ? "true" : "false";
  document.body.dataset.m1ExportUsesPackageEnvelope = exportPath.usesDomdocPackageEnvelope
    ? "true"
    : "false";
  const domdocStore = new MemoryDomdocBlobStoreStub();
  if (exportPath.usesDomdocPackageEnvelope) {
    const domdocSaved = saveProsemirrorDemoDomdocPackageStub(viewer.slice, domdocStore);
    document.body.dataset.m1DomdocPackageSaveOk = domdocSaved.simulation.ok ? "true" : "false";
    const domdocReopened = loadProsemirrorDemoDomdocPackageStub(domdocSaved.packageZipBytes);
    document.body.dataset.m1DomdocPackageRoundTripOk = domdocReopened ? "true" : "false";
  } else {
    document.body.dataset.m1DomdocPackageSaveOk = "skipped";
    document.body.dataset.m1DomdocPackageRoundTripOk = "skipped";
    document.body.dataset.m1EnhancedNativeExportStub = "true";
  }

  document.body.dataset.m5LazyFeatureManifestSchema = String(LAZY_FEATURE_MANIFEST_STUB.schemaVersion);
  document.body.dataset.m5LazyFeatureHostCount = String(LAZY_FEATURE_MANIFEST_STUB.hostExamples.length);
  document.body.dataset.m5LazyFeatureGateStatus = LAZY_FEATURE_MANIFEST_STUB.gateStatus;

  const g5Session = createDocumentSession(sessionStub);
  const g5Store = new MemoryDomdocBlobStoreStub();
  const g5Lease = g5Session.tryAcquireTabWriterLease("tab-primary");
  const g5Conflict = g5Session.saveDomdocPackageStubToStore(g5Store, {
    writerTabId: "tab-other",
    writerFenceGeneration: g5Lease.ok ? g5Lease.fenceGeneration : 0,
  });
  document.body.dataset.g5FencedTabConflictOk = g5Conflict.simulation.ok ? "true" : "false";
  document.body.dataset.g5FencedTabConflictDetail = g5Conflict.simulation.detail ?? "";
  if (g5Lease.ok) {
    const g5Owned = g5Session.saveDomdocPackageStubToStore(g5Store, {
      writerTabId: "tab-primary",
      writerFenceGeneration: g5Lease.fenceGeneration,
    });
    document.body.dataset.g5FencedTabWriterOk = g5Owned.simulation.ok ? "true" : "false";
  }
  const g5CrashStore = new MemoryDomdocBlobStoreStub();
  const g5CrashSim = g5CrashStore.applyStagedWrite(
    "source/native-checkpoint.bin",
    createDomdocPackagePersistPlanStub(sessionStub),
    new TextEncoder().encode("native-checkpoint-stub"),
    serializeDomdocPackageManifestStub(sessionStub),
    { abortAfterStep: "commit-indexeddb-manifest-transaction" },
  );
  document.body.dataset.g5CrashSafeAbortOk = g5CrashSim.ok ? "true" : "false";
  document.body.dataset.g5CrashSafeAbortDetail = g5CrashSim.detail ?? "";
  document.body.dataset.g5CrashSafeManifestCommitted = g5CrashStore.readCommittedManifest()
    ? "true"
    : "false";

  void Promise.all([tryLoadPdfiumLibProbeRender(), describePdfiumWasmReadPathBrowser()]).then(
    ([probe, readPath]) => {
      document.body.dataset.g1PdfiumProbeRender = probe.moduleLoaded ? "loaded" : "absent";
      document.body.dataset.g1PdfiumProbePresent = probe.probePresent ? "true" : "false";
      document.body.dataset.g1PdfiumReadPathLoaded = readPath.moduleLoaded ? "true" : "false";
      document.body.dataset.g1PdfiumWriterExportsReady = readPath.writerExportsReady
        ? "true"
        : "false";
      document.body.dataset.g1PdfiumProbePageBitmapBytes = probe.moduleLoaded ? "4" : "0";
      document.body.dataset.g1PdfiumProbePageBitmapSynthetic = probe.moduleLoaded ? "true" : "false";
    },
  );

  document.body.dataset.m5ReactAdapter = domdocReactAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5VueAdapter = domdocVueAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5LitAdapter = domdocLitAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5AngularAdapter = domdocAngularAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5SvelteAdapter = domdocSvelteAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5NextHostAdapter = domdocNextHostAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5NextHostBoundary = domdocNextHostAdapterDemoSurface("demo-sess").host;
  document.body.dataset.m5NuxtHostAdapter = domdocNuxtHostAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5NuxtHostBoundary = domdocNuxtHostAdapterDemoSurface("demo-sess").host;
  document.body.dataset.m5SvelteKitHostAdapter = domdocSvelteKitHostAdapterDemoSurface(
    "demo-sess",
  ).surface;
  document.body.dataset.m5SvelteKitHostBoundary = domdocSvelteKitHostAdapterDemoSurface(
    "demo-sess",
  ).host;
  document.body.dataset.m5AstroHostAdapter = domdocAstroHostAdapterDemoSurface("demo-sess").surface;
  document.body.dataset.m5AstroHostBoundary = domdocAstroHostAdapterDemoSurface("demo-sess").host;
  if (params.get("m5Extended") !== "0") {
    document.body.dataset.m5PreactAdapter = domdocPreactAdapterDemoSurface("demo-sess").surface;
    document.body.dataset.m5SolidAdapter = domdocSolidAdapterDemoSurface("demo-sess").surface;
  }

  const commentsMembers = new Map<string, Uint8Array>();
  commentsMembers.set(
    "word/comments.xml",
    new TextEncoder().encode(
      `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="Reviewer"/><w:comment w:id="1" w:author="Author" w:parentId="0"/></w:comments>`,
    ),
  );
  const annotationsWire = buildAnnotationsWireStubFromOpcMembers(commentsMembers);
  for (const label of listAnnotationWireStubLabels(annotationsWire)) {
    const li = document.createElement("li");
    li.textContent = label;
    shell.commentsList.appendChild(li);
  }
  document.body.dataset.m5CommentsWireCount = String(annotationsWire.comments.commentCount);
  document.body.dataset.m5CommentsThreadCount = String(annotationsWire.reviewThreads.length);

  let trackedStore = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
  document.body.dataset.m4DocxTrackChangesExportOk = "pending";

  const syncM4TrackChangesExportFromSession = (): void => {
    const trackedExport = exportDocxTrackChangesFromStoreStub(trackedStore, viewer.slice.session);
    const pkg = readOpcPackage(trackedExport.result.zipBytes);
    const documentXml = new TextDecoder().decode(pkg.members.get("word/document.xml") ?? new Uint8Array());
    const markers = readDocxTrackChangesMarkerSnapshot(documentXml);
    document.body.dataset.m4DocxTrackChangesExportOk =
      trackedExport.result.zipBytes.byteLength > 100 ? "true" : "false";
    document.body.dataset.m4DocxTrackChangesExportFeature = trackedExport.result.featureId;
    document.body.dataset.m4DocxTrackChangesHasIns = markers.hasIns ? "true" : "false";
    document.body.dataset.m4DocxTrackChangesHasDel = markers.hasDel ? "true" : "false";
    document.body.dataset.m4DocxTrackChangesTrackedPreserved = trackedExport.result.trackedMarkersPreserved
      ? "true"
      : "false";
  };

  shell.acceptCommentButton.addEventListener("click", () => {
    const firstThread = annotationsWire.reviewThreads[0];
    const commentId = firstThread?.commentIds[0] ?? "0";
    const acceptResult = dispatchCommentPanelAcceptAction(commentId, {
      session: viewer.slice.session,
      trackedStore,
    });
    document.body.dataset.m2CommentAcceptApplied = acceptResult.applied ? "true" : "false";
    document.body.dataset.m2CommentAcceptDetail = acceptResult.detail;
    document.body.dataset.m2CommentAcceptId = acceptResult.commentId;
    document.body.dataset.m2CommentAcceptOpcApplied = acceptResult.opcPatchApplied
      ? "true"
      : "false";
    document.body.dataset.m2CommentAcceptSuggestionId = acceptResult.reviewSuggestionId ?? "";
    if (acceptResult.nextStore) {
      trackedStore = acceptResult.nextStore;
    }
    if (acceptResult.nextSession) {
      viewer.slice = { ...viewer.slice, session: acceptResult.nextSession };
      syncProsemirrorDemoDataset();
    }
    syncM4TrackChangesExportFromSession();
  });

  shell.rejectSuggestionButton.addEventListener("click", () => {
    const rejectResult = dispatchProsemirrorDemoRejectSuggestionStub({
      slice: viewer.slice,
      trackedStore,
    });
    document.body.dataset.m3ProsemirrorRejectApplied = rejectResult.applied ? "true" : "false";
    document.body.dataset.m3ProsemirrorRejectDetail = rejectResult.detail;
    document.body.dataset.m3ProsemirrorRejectSuggestionId = rejectResult.suggestionId;
    if (rejectResult.trackedStore) {
      trackedStore = rejectResult.trackedStore;
    }
    if (rejectResult.slice) {
      viewer.slice = rejectResult.slice;
      syncProsemirrorDemoDataset();
    }
    syncM4TrackChangesExportFromSession();
  });

  await viewer.renderDocx();
  document.body.dataset.engineReady = "true";
  document.body.dataset.layoutStable = "true";

  const response = JSON.parse(
    engine.render_projection_json(
      JSON.stringify({
        header: {
          protocolVersion: 1,
          schemaId: "domdoc://render-wire/v1",
          requestId: "demo-req",
          sessionId: "demo-sess",
          documentGeneration: 1,
          units: "pt",
        },
        pages: viewer.slice.store.getBody().children?.length
          ? [
              {
                pageIndex: 0,
                widthPt: 612,
                heightPt: 792,
                runs: [
                  {
                    runId: "run-demo",
                    text: proseMirrorParagraphTexts(viewer.slice.doc)[0] ?? "domdoc",
                    xPt: 72,
                    yPt: 720,
                    fontSizePt: 12,
                  },
                ],
              },
            ]
          : [],
      }),
    ),
  ) as RenderWireResponse;

  let input = createCompositorInputState(response);
  input = pointerDownWithCaret(
    input,
    { xPt: 80, yPt: 720 },
    response,
    proseMirrorParagraphTexts(viewer.slice.doc)[0] ?? "domdoc",
  );
  document.body.dataset.inputHookReady = input.active ? "true" : "false";
  document.body.dataset.caretOffset = String(input.active?.caretOffset ?? 0);

  const layoutInput = {
    paragraph_id: "demo-p",
    text: "layout stability probe",
    max_width_pt: 180,
    font_size_pt: 12,
  };
  document.body.dataset.layoutStable =
    engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput)) ===
    engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput))
      ? "true"
      : "false";
  document.body.dataset.shapingBackend = engine.layout_shaping_backend_id();

  const afVerdicts = evaluateAfBrowserCorpus((payload) =>
    engine.layout_flow_paragraph_shaped_json(payload),
  );
  document.body.dataset.afCorpusCount = String(afVerdicts.length);
  document.body.dataset.afCorpusConverged = afCorpusAllConverged(afVerdicts) ? "true" : "false";

  const wasmHook = createWasmShapedLayoutHook(engine);
  const postEditEvidence = buildAfBrowserPostEditGateGradeEvidence(
    wasmHook.shapedLayoutJson,
    (paragraphPayload, breakAfterCharIndex, preEditText) => {
      if (typeof engine.layout_flow_paragraph_incremental_json !== "function") {
        return engine.layout_flow_paragraph_shaped_json(
          JSON.stringify({ ...JSON.parse(paragraphPayload), text: preEditText }),
        );
      }
      return String(
        engine.layout_flow_paragraph_incremental_json(
          JSON.stringify({
            paragraph: JSON.parse(paragraphPayload),
            breakAfterCharIndex,
            preEditText,
          }),
        ),
      );
    },
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

  let composition = input.active ? beginComposition(input.active, "") : null;
  shell.imeInput.addEventListener("compositionstart", () => {
    if (!input.active) return;
    composition = beginComposition(input.active, "");
    document.body.dataset.compositionState = "active";
  });
  shell.imeInput.addEventListener("compositionupdate", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    document.body.dataset.compositionPreedit = composition.preedit;
  });
  shell.imeInput.addEventListener("compositionend", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    const committed = commitComposition(composition);
    input = { ...input, active: committed.region };
    document.body.dataset.compositionState = "committed";
    document.body.dataset.caretOffset = String(committed.region.caretOffset);
    document.body.dataset.compositionInserted = String(committed.insertedLength);
  });
}

boot().catch((err) => {
  document.body.dataset.engineReady = "error";
  document.body.dataset.engineError = err instanceof Error ? err.message : String(err);
});
