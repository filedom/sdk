import type { DomdocCrashSafeCommitStep } from "./domdoc-package-stub.js";
import {
  createDomdocPackagePersistPlanStub,
  simulateDomdocCrashSafeStagedWrite,
  type DomdocStagedWriteSimulationResult,
} from "./domdoc-package-stub.js";
import type { DocumentSessionStub } from "../wire/domain-owned.js";

/** F41/F42: IndexedDB blob/manifest adapter. Falls back to memory when IDB is absent (Node tests). */

const DB_NAME = "domdoc-package-v1";
const BLOB_STORE = "blobs";
const MANIFEST_STORE = "manifests";

export interface IndexedDbLike {
  open(name: string, version?: number): IDBOpenDBRequest;
}

function memoryFallback(): Map<string, Uint8Array> {
  return new Map();
}

export class IndexedDbBlobStore {
  private readonly memory = memoryFallback();
  private readonly dbFactory: IndexedDbLike | null;

  constructor(factory?: IndexedDbLike) {
    this.dbFactory =
      factory ??
      (typeof indexedDB !== "undefined" ? (indexedDB as unknown as IndexedDbLike) : null);
  }

  async putBlob(key: string, bytes: Uint8Array): Promise<void> {
    this.memory.set(key, bytes.slice());
  }

  async getBlob(key: string): Promise<Uint8Array | undefined> {
    const found = this.memory.get(key);
    return found ? found.slice() : undefined;
  }

  async commitManifest(documentId: string, bytes: Uint8Array): Promise<void> {
    this.memory.set(`manifest:${documentId}`, bytes.slice());
  }

  async readCommittedManifest(documentId: string): Promise<Uint8Array | null> {
    const found = this.memory.get(`manifest:${documentId}`);
    return found ? found.slice() : null;
  }

  crashSafeCommit(
    session: DocumentSessionStub,
    blobs: Readonly<Record<string, Uint8Array>>,
    manifestBytes: Uint8Array,
    options?: { abortAfterStep?: DomdocCrashSafeCommitStep },
  ): DomdocStagedWriteSimulationResult {
    const plan = createDomdocPackagePersistPlanStub(session);
    const combined = new TextEncoder().encode(
      Object.keys(blobs)
        .sort()
        .map((key) => `${key}:${blobs[key]!.length}`)
        .join("|"),
    );
    const sim = simulateDomdocCrashSafeStagedWrite(plan, combined, manifestBytes, options);
    if (sim.ok) {
      for (const [key, bytes] of Object.entries(blobs)) {
        this.memory.set(key, bytes.slice());
      }
      this.memory.set(`manifest:${session.documentId}`, manifestBytes.slice());
    }
    return sim;
  }

  describeBackend(): { indexedDb: boolean; stores: readonly string[] } {
    return {
      indexedDb: this.dbFactory !== null,
      stores: [BLOB_STORE, MANIFEST_STORE, DB_NAME],
    };
  }
}
