import { bundleUrl, formatEngine, pdfEngine } from "./cdn.js";
import type { EngineModule, EngineSession } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import { detectFormat } from "./formats.js";

/**
 * Host switches. A format that is not set is never fetched.
 * Track changes is a separate module: it edits the original file and is
 * loaded only when the host sets it.
 */
/** Formats `CoreLoader` can open. PDF uses PDFium. Each Office type loads its own module when `formatModules` is set. */
export type EngineFormat = "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx";

export interface HostEngineConfig {
  pdf?: boolean;
  doc?: boolean;
  docx?: boolean;
  xls?: boolean;
  xlsx?: boolean;
  ppt?: boolean;
  pptx?: boolean;
  trackChanges?: boolean;
}

/** Every engine on, including track changes. */
export const ALL_ENGINES: HostEngineConfig = {
  pdf: true,
  doc: true,
  docx: true,
  xls: true,
  xlsx: true,
  ppt: true,
  pptx: true,
  trackChanges: true,
};

/** Where a revision list can be read after it is written into the original file. */
export type RevisionVisibility = "file" | "domdoc";

export type PlannedModule =
  | { id: "pdfium"; role: "engine" }
  | { id: "pdfium-render"; role: "wrapper" }
  | { id: "office-oxide"; role: "engine" }
  | { id: "track-changes"; role: "revisions"; visibleIn: RevisionVisibility };

export interface LoadPlan {
  format: EngineFormat;
  /** Engines for this file. After the core file, these download together. */
  modules: PlannedModule[];
  /** The engine opens these bytes. Nothing is converted before that. */
  source: "original";
}

export interface TrackChangesBinding {
  format: EngineFormat;
  /** The same bytes the engine opened. Revisions are written back into this file. */
  original: Uint8Array;
  /**
   * `file` — Word reads the revision history (DOC/DOCX).
   * `domdoc` — the history is inside the PDF, and only domdoc shows it.
   */
  visibleIn: RevisionVisibility;
  session: EngineSession;
}

export interface TrackChangesModule {
  default?: () => Promise<unknown>;
  attach(binding: TrackChangesBinding): void;
}

/** Importers the host points at a CDN or a local build. Core does not embed them. */
export interface EngineSources {
  /**
   * Small bootstrap. This is the only file that must finish before the engines
   * start. Those engines then download together.
   */
  core: () => Promise<unknown>;
  /** PDFium WebAssembly. Fetched only when a PDF is opened or preloaded. */
  pdfiumWasm: string;
  /** `pdfium-render` wrapper. Its download starts with `pdfiumWasm`, not after it. */
  pdfiumRender: () => Promise<EngineModule>;
  /** `office_oxide`. Used when `formatModules` does not list that format. */
  officeOxide: () => Promise<EngineModule>;
  /** One glue module per format. A listed format is not loaded from `officeOxide`. */
  formatModules?: Partial<Record<EngineFormat, () => Promise<EngineModule>>>;
  /** Revision writer. Called only when `trackChanges` is set. */
  trackChanges?: () => Promise<TrackChangesModule>;
}

export interface PreparedOpen {
  plan: LoadPlan;
  engine: EngineModule;
  trackChanges?: TrackChangesModule;
  original: Uint8Array;
}

const WORD = new Set<PlannedModule["id"]>(["office-oxide"]);

/**
 * Decides the modules for one file from the host switches.
 * Does not fetch anything.
 */
const ENGINES = new Set<EngineFormat>(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

function isEngineFormat(format: string): format is EngineFormat {
  return ENGINES.has(format as EngineFormat);
}

export function planLoad(bytes: Uint8Array, name: string, host: HostEngineConfig): LoadPlan {
  const format = detectFormat(bytes, name);
  if (!isEngineFormat(format)) throw new DomdocError("unsupported-format", format);
  if (!host[format]) throw new DomdocError("format-disabled", format);

  const modules: PlannedModule[] =
    format === "pdf"
      ? [
          { id: "pdfium", role: "engine" },
          { id: "pdfium-render", role: "wrapper" },
        ]
      : [{ id: "office-oxide", role: "engine" }];

  if (host.trackChanges) {
    modules.push({
      id: "track-changes",
      role: "revisions",
      visibleIn: format === "pdf" ? "domdoc" : "file",
    });
  }

  return { format, modules, source: "original" };
}

/**
 * CDN layout for the optional engines. Nothing here is downloaded until
 * `CoreLoader` opens a file the host enabled.
 */
export function enginesFromCdn(base: string): EngineSources {
  const root = base.replace(/\/$/, "");
  const formatModules: Partial<Record<EngineFormat, () => Promise<EngineModule>>> = {};
  for (const format of ["doc", "docx", "xls", "xlsx", "ppt", "pptx"] as const) {
    formatModules[format] = formatEngine(bundleUrl(root, format));
  }
  return {
    core: async () => ({}),
    pdfiumWasm: `${root}/pdf/pdfium.wasm`,
    pdfiumRender: pdfEngine(bundleUrl(root, "pdf"), `${root}/pdf/pdfium.wasm`),
    officeOxide: formatModules.docx!,
    formatModules,
    trackChanges: () => import("./engines/track.js"),
  };
}

/**
 * The basic core. It paints nothing by itself: the viewer shows a blank page
 * and a spinner, then this loader fetches only the engines for that file.
 */
export class CoreLoader {
  private coreReady?: Promise<unknown>;
  private pdfiumBinary?: Promise<ArrayBuffer>;
  private pdfiumModule?: Promise<EngineModule>;
  private pdfReady?: Promise<EngineModule>;
  private readonly moduleReady = new Map<string, Promise<EngineModule>>();
  private trackReady?: Promise<TrackChangesModule>;

  constructor(
    private readonly host: HostEngineConfig,
    private readonly sources: EngineSources,
  ) {}

  plan(bytes: Uint8Array, name = ""): LoadPlan {
    return planLoad(bytes, name, this.host);
  }

  /**
   * Starts the core file and nothing else. PDF, Word, and track changes wait
   * until a file type is known, then those files start together.
   */
  preload(): Promise<void> {
    return this.ensureCore().then(() => undefined);
  }

  /** Loads the planned modules and leaves the original bytes for open. */
  async prepare(bytes: Uint8Array, name = ""): Promise<PreparedOpen> {
    const plan = this.plan(bytes, name);
    await this.ensureCore();
    if (plan.format === "pdf") this.startPdf();
    const enginePromise = plan.format === "pdf" ? this.pdfReady! : this.formatReady(plan.format);
    const withHistory = plan.modules.some((module) => module.id === "track-changes");
    if (withHistory) this.startTrack();
    const [engine, trackChanges] = await Promise.all([
      enginePromise,
      withHistory ? this.trackReady! : Promise.resolve(undefined),
    ]);
    return { plan, engine, trackChanges, original: bytes };
  }

  /** Module ids this loader has started fetching. */
  requested(): string[] {
    const ids: string[] = [];
    if (this.coreReady) ids.push("core");
    if (this.pdfiumBinary || this.pdfReady) ids.push("pdfium", "pdfium-render");
    if (this.moduleReady.has("office")) ids.push("office-oxide");
    for (const key of this.moduleReady.keys()) {
      if (key !== "office") ids.push(key);
    }
    if (this.trackReady) ids.push("track-changes");
    return ids;
  }

  private ensureCore(): Promise<unknown> {
    this.coreReady ??= this.sources.core();
    return this.coreReady;
  }

  /** Starts the PDFium binary and the wrapper in the same turn. Init waits for both. */
  private startPdf(): void {
    if (this.pdfReady) return;
    this.pdfiumBinary ??= fetch(this.sources.pdfiumWasm).then(async (response) => {
      if (!response.ok) throw new DomdocError("bundle-missing", `pdfium: ${response.status}`);
      return response.arrayBuffer();
    });
    this.pdfiumModule ??= this.sources.pdfiumRender();
    const binary = this.pdfiumBinary;
    const wrapper = this.pdfiumModule;
    this.pdfReady = Promise.all([binary, wrapper]).then(async ([wasmBinary, module]) => {
      await module.default({ wasmBinary });
      return module;
    });
  }

  /** One module per format when `formatModules` lists it. Otherwise every Office type shares `officeOxide`. */
  private formatReady(format: EngineFormat): Promise<EngineModule> {
    const specific = this.sources.formatModules?.[format];
    const key = specific ? format : "office";
    let pending = this.moduleReady.get(key);
    if (!pending) {
      const load = specific ?? this.sources.officeOxide;
      pending = load().then(async (module) => {
        await module.default();
        return module;
      });
      this.moduleReady.set(key, pending);
    }
    return pending;
  }

  private startTrack(): void {
    if (this.trackReady) return;
    if (!this.sources.trackChanges) {
      this.trackReady = Promise.reject(new DomdocError("bundle-missing", "track-changes"));
      return;
    }
    const load = this.sources.trackChanges;
    this.trackReady = load().then(async (module) => {
      await module.default?.();
      return module;
    });
  }
}

/** Copy for the blank page while that format's engines are still downloading. */
export function loadingLabel(format: EngineFormat): string {
  if (format === "pdf") return "Loading PDF";
  if (format === "xls" || format === "xlsx") return "Loading spreadsheet";
  if (format === "ppt" || format === "pptx") return "Loading presentation";
  return "Loading Word";
}

/**
 * The engines shipped with the SDK. `pdfiumWasm` is the URL of the PDFium
 * module; the host passes a file URL in Node and a bundled asset in the browser.
 * The core import resolves immediately because the viewer shell is already running.
 */
export function bundledEngines(pdfiumWasm: string): EngineSources {
  return {
    core: async () => ({}),
    pdfiumWasm,
    pdfiumRender: () => import("./engines/domdoc-pdf.js"),
    officeOxide: () => import("./engines/domdoc-office.js"),
    trackChanges: () => import("./engines/track.js"),
  };
}

/** Core loader with PDFium, office_oxide and track changes wired to the installed packages. */
export function createEngineLoader(pdfiumWasm: string, host: HostEngineConfig = ALL_ENGINES): CoreLoader {
  return new CoreLoader(host, bundledEngines(pdfiumWasm));
}

/** True when the plan is the shared Word engine rather than PDFium. */
export function usesOfficeOxide(plan: LoadPlan): boolean {
  return plan.modules.some((module) => WORD.has(module.id));
}
