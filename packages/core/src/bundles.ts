import type { EngineModule, Format } from "./engine-types.js";
import { DomdocError } from "./errors.js";

/**
 * One dynamic import per format so a PDF-only session never downloads the DOCX/DOC
 * bundles (and vice versa). Pass `bundlesFromCdn(base)` so each glue module is
 * fetched from the CDN only when that format is opened.
 */
export type BundleImporters = Partial<Record<Format, () => Promise<EngineModule>>>;

export class BundleLoader {
  private readonly ready = new Map<Format, Promise<EngineModule>>();

  constructor(private readonly importers: BundleImporters) {}

  supports(format: Format): boolean {
    return Boolean(this.importers[format]);
  }

  /** Formats whose bundle has been requested (loaded or loading). */
  requested(): Format[] {
    return [...this.ready.keys()];
  }

  load(format: Format): Promise<EngineModule> {
    let pending = this.ready.get(format);
    if (!pending) {
      const importer = this.importers[format];
      if (!importer) return Promise.reject(new DomdocError("bundle-missing", format));
      pending = importer().then(async (module) => {
        await module.default();
        return module;
      });
      pending.catch(() => this.ready.delete(format));
      this.ready.set(format, pending);
    }
    return pending;
  }
}
