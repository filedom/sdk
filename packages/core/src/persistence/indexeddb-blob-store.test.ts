import { describe, expect, it } from "vitest";
import { IndexedDbBlobStore } from "./indexeddb-blob-store.js";
import { serializeDomdocPackageManifestStub } from "./domdoc-package-stub.js";

const session = {
  documentId: "idb-1",
  kind: "flow" as const,
  revisions: {
    committedRevision: 1,
    persistedRevision: 0,
    materializedRevision: 1,
    exportedRevision: 0,
    sharedRevision: null,
    renderedRevision: 1,
  },
};

describe("F41 IndexedDB blob store (memory fallback in Node)", () => {
  it("commits blobs before manifest and recovers only committed bytes", () => {
    const store = new IndexedDbBlobStore();
    const manifest = serializeDomdocPackageManifestStub(session);
    const sim = store.crashSafeCommit(
      session,
      { "source/native-checkpoint.bin": new TextEncoder().encode("ckpt") },
      manifest,
    );
    expect(sim.ok).toBe(true);
    expect(store.describeBackend().indexedDb).toBe(false);
  });

  it("does not commit manifest when aborted at verify", async () => {
    const store = new IndexedDbBlobStore();
    const sim = store.crashSafeCommit(
      session,
      { "source/native-checkpoint.bin": new TextEncoder().encode("ckpt") },
      serializeDomdocPackageManifestStub(session),
      { abortAfterStep: "verify-blob-bytes" },
    );
    expect(sim.ok).toBe(false);
    expect(await store.readCommittedManifest(session.documentId)).toBeNull();
  });
});
