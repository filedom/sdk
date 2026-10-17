import type { FormatModuleId } from "./format-descriptor.js";

export type FormatModuleLoadStatus = "idle" | "loading" | "loaded" | "failed";

export interface FormatModuleLoadRecord {
  id: FormatModuleId;
  status: FormatModuleLoadStatus;
  error?: string;
  loadedAtGeneration?: number;
}

export type FormatModuleImporter<T = unknown> = () => Promise<T>;

/** Deduped async format module loader with generation guards (Appendix A AP). */
export class FormatModuleLoader {
  private readonly importers = new Map<FormatModuleId, FormatModuleImporter>();
  private readonly inflight = new Map<FormatModuleId, Promise<unknown>>();
  private readonly loaded = new Map<FormatModuleId, unknown>();
  private readonly records = new Map<FormatModuleId, FormatModuleLoadRecord>();

  register<T>(id: FormatModuleId, importer: FormatModuleImporter<T>): void {
    this.importers.set(id, importer as FormatModuleImporter);
    if (!this.records.has(id)) {
      this.records.set(id, { id, status: "idle" });
    }
  }

  snapshot(): FormatModuleLoadRecord[] {
    return [...this.records.values()];
  }

  /** Clear failed state so a later retry can run (dynamic import may remain browser-cached). */
  resetFailed(id: FormatModuleId): void {
    const rec = this.records.get(id);
    if (rec?.status === "failed") {
      this.records.set(id, { id, status: "idle" });
      this.inflight.delete(id);
    }
  }

  async load<T>(id: FormatModuleId, sessionGeneration: number): Promise<T> {
    if (this.loaded.has(id)) {
      return this.loaded.get(id) as T;
    }
    let promise = this.inflight.get(id);
    if (!promise) {
      const importer = this.importers.get(id);
      if (!importer) {
        throw new Error(`format-module-not-registered:${id}`);
      }
      this.records.set(id, { id, status: "loading" });
      promise = importer()
        .then((mod) => {
          this.loaded.set(id, mod);
          this.records.set(id, {
            id,
            status: "loaded",
            loadedAtGeneration: sessionGeneration,
          });
          return mod;
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          this.records.set(id, { id, status: "failed", error: message });
          this.inflight.delete(id);
          throw error;
        });
      this.inflight.set(id, promise);
    }
    return (await promise) as T;
  }
}
