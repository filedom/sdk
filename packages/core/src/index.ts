export * from "./engine-types.js";
export { BundleLoader, type BundleImporters } from "./bundles.js";
export { bundleUrl, bundlesFromCdn, type CdnBundleOptions, type GlueLoader } from "./cdn.js";
export {
  ComponentRegistry,
  isFlowMode,
  sizeBasis,
  toPoints,
  type ComponentContext,
  type ComponentFactory,
  type ComponentHandle,
  type FlowMode,
  type Length,
  type Placement,
  type PlacementPosition,
} from "./components.js";
export { DomdocDocument, type DocumentChange, type PageRaster } from "./document.js";
export { DomdocError } from "./errors.js";
export { Editor, isCollapsed, normalizePaste, samePos, type Selection } from "./editor.js";
export { FileStore, type AddFileOptions, type FileInput, type FileSource, type StoredFile } from "./file-store.js";
export { ACCEPT, detectFormat, exportName, fileKind, unwiredDetail } from "./formats.js";
export * as geometry from "./geometry.js";
export * as navigation from "./navigation.js";
export {
  ALL_ENGINES,
  CoreLoader,
  bundledEngines,
  createEngineLoader,
  enginesFromCdn,
  loadingLabel,
  planLoad,
  usesOfficeOxide,
  type EngineFormat,
  type EngineSources,
  type HostEngineConfig,
  type LoadPlan,
  type PlannedModule,
  type PreparedOpen,
  type RevisionVisibility,
  type TrackChangesBinding,
  type TrackChangesModule,
} from "./modules.js";
export { openDocument, type OpenOptions, type OpenSource } from "./open.js";
export { promptForPassword, type PasswordHint } from "./password-prompt.js";
export { paintFlowPage, paintRaster } from "./paint.js";
export { VIEWER_CSS } from "./styles.js";
export { DomdocViewer, type Annotation, type ChromeDir, type HighlightEvent, type SelectionState, type ThemeConfig, type ThemeName, type ThemePreference, type ThemeToken, type ThemeTokens, type ViewerEvents, type ViewerOptions, type ViewMode } from "./viewer.js";
export * as zoom from "./zoom.js";
export { shouldMount, type RenderDecision, type RenderMode, type RenderPolicyInput } from "./render-policy.js";
export {
  TOOLBAR_CATALOG,
  actionAvailability,
  actionHint,
  groupAvailability,
  type CatalogContext,
  type SelectionKind,
} from "./toolbar-catalog.js";
export { createDocumentRequest, exportTargets, openNewFileDialog, A4_PT } from "./new-file.js";
export {
  LayersPanel,
  LayerElementsCache,
  elementListName,
  layerElementsForPage,
  layerElementsKey,
  type LayerActions,
  type LayerElementItem,
} from "./layers.js";
export { HistoryPanel, type HistoryActions } from "./history.js";
export {
  createViewerStore,
  type ViewerStore,
  type ViewerStoreAction,
  type ViewerStoreDocument,
  type ViewerStoreRunResult,
  type ViewerStoreSearch,
  type ViewerStoreSnapshot,
  type ViewerStoreStatus,
} from "./headless.js";
export { Toolbar, type ToolbarActions, type ToolbarState } from "./toolbar.js";
// ViewMode stays exported from ./viewer.js.

import { DomdocViewer, type ViewerOptions } from "./viewer.js";

/** Mounts a viewer into an element of the host SPA. */
export function createViewer(element: HTMLElement, options: ViewerOptions): DomdocViewer {
  return new DomdocViewer(element, options);
}
