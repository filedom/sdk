import { describe, expect, it } from "vitest";
import { createDocumentSession, DocumentSession } from "./document-session.js";
import {
  createDomdocPackageBlobIndexStub,
  createDomdocPackageManifestStub,
  createDomdocPackagePersistPlanStub,
  DOMDOC_CRASH_SAFE_COMMIT_STEPS,
  parseDomdocPackageManifestStub,
  serializeDomdocPackageManifestStub,
  validateDomdocCrashSafeCommitPlan,
  simulateDomdocCrashSafeStagedWrite,
  MemoryDomdocBlobStoreStub,
  attachM2DemoSessionBindingToManifestStub,
  attachMultiBlobMemberKeysToManifestStub,
} from "../persistence/domdoc-package-stub.js";
import { readOpcPackage, writeOpcPackage } from "../formats/docx/opc-package.js";
import { DOCX_NUMBERING_PART } from "../formats/docx/docx-numbering-opc-patch.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "../formats/docx/review-minimal-docx-fixture.js";
import { parseReviewSuggestionMarksFromDocumentXml } from "../formats/docx/review-suggestion-accept-reject-stub.js";

describe("M1 DocumentSession skeleton", () => {
  const base = {
    documentId: "doc-1",
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

  it("commits projection stub revisions", () => {
    const session = createDocumentSession(base);
    const next = session.commitDocxProjectionStub({
      kind: "docx-projection-sync",
      targetRevision: 2,
      paragraphTexts: ["a"],
      listMarkers: [""],
    });
    expect(next.revisions.committedRevision).toBe(2);
  });

  it("builds domdoc package manifest stub", () => {
    const manifest = createDomdocPackageManifestStub(base);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.documentId).toBe("doc-1");
    expect(manifest.requiredMembers).toContain("state/");
  });

  it("serializes manifest.json UTF-8 write stub (M1)", () => {
    const bytes = serializeDomdocPackageManifestStub(base);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { documentId: string };
    expect(parsed.documentId).toBe("doc-1");
  });

  it("round-trips domdoc package manifest stub bytes (M1/G5)", () => {
    const bytes = serializeDomdocPackageManifestStub(base);
    const roundTrip = parseDomdocPackageManifestStub(bytes);
    expect(roundTrip.documentId).toBe(base.documentId);
    expect(roundTrip.kind).toBe(base.kind);
    expect(roundTrip.committedRevision).toBe(base.revisions.committedRevision);
  });

  it("builds domdoc blob index stub", () => {
    const index = createDomdocPackageBlobIndexStub(base);
    expect(index.members.length).toBeGreaterThanOrEqual(5);
  });

  it("builds crash-safe persist plan stub (§13.2)", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    expect(plan.commitSteps).toEqual([...DOMDOC_CRASH_SAFE_COMMIT_STEPS]);
    expect(plan.recoveryPolicy).toBe("committed-manifest-only");
  });

  it("G5 validates crash-safe commit step ordering (M1 round-trip slice)", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    expect(validateDomdocCrashSafeCommitPlan(plan)).toEqual({ ok: true });
    const bytes = serializeDomdocPackageManifestStub(base);
    const manifest = parseDomdocPackageManifestStub(bytes);
    expect(manifest.nativeCheckpointRevision).toBe(base.revisions.materializedRevision);
  });

  it("G5 memory blob store applies multi-blob manifest commit simulation", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    const manifestBytes = serializeDomdocPackageManifestStub(base);
    const store = new MemoryDomdocBlobStoreStub();
    const sim = store.applyMultiBlobStagedWrite(
      {
        "source/native-checkpoint.bin": new TextEncoder().encode("checkpoint"),
        "state/semantic-journal.jsonl": new TextEncoder().encode('{"rev":1}\n'),
      },
      plan,
      manifestBytes,
    );
    expect(sim.ok).toBe(true);
    expect(store.readBlob("source/native-checkpoint.bin")).toBeDefined();
    expect(store.readBlob("state/semantic-journal.jsonl")).toBeDefined();
    expect(store.readCommittedManifest()).toEqual(manifestBytes);
    expect(store.lastCommittedBlobKeys).toEqual([
      "source/native-checkpoint.bin",
      "state/semantic-journal.jsonl",
    ]);
    const manifest = parseDomdocPackageManifestStub(manifestBytes);
    const withKeys = attachMultiBlobMemberKeysToManifestStub(
      manifest,
      store.lastCommittedBlobKeys,
      {
        "source/native-checkpoint.bin": store.readBlob("source/native-checkpoint.bin")!,
        "state/semantic-journal.jsonl": store.readBlob("state/semantic-journal.jsonl")!,
      },
    );
    expect(withKeys.memberHashes["source/native-checkpoint.bin"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("G5/M2 attaches demo session binding to manifest stub", () => {
    const manifest = createDomdocPackageManifestStub(base);
    const withBinding = attachM2DemoSessionBindingToManifestStub(manifest, {
      sessionId: "demo-sess",
      toolbarSessionId: "demo-sess",
    });
    expect(withBinding.m2DemoSessionBinding?.sessionId).toBe("demo-sess");
  });

  it("M1/M2 binds input capture log slot id on manifest stub (G3-INPUT-18)", () => {
    const manifest = createDomdocPackageManifestStub(base);
    const withBinding = attachM2DemoSessionBindingToManifestStub(manifest, {
      sessionId: "demo-sess",
      inputCaptureLogSlotId: "IME-01-real",
    });
    expect(withBinding.m2DemoSessionBinding?.inputCaptureLogSlotId).toBe("IME-01-real");
  });

  it("G5 memory blob store applies staged write after simulation passes", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    const manifestBytes = serializeDomdocPackageManifestStub(base);
    const blobBytes = new TextEncoder().encode("native-checkpoint-stub");
    const store = new MemoryDomdocBlobStoreStub();
    const sim = store.applyStagedWrite("source/native-checkpoint.bin", plan, blobBytes, manifestBytes);
    expect(sim.ok).toBe(true);
    expect(store.readBlob("source/native-checkpoint.bin")).toEqual(blobBytes);
    expect(store.readCommittedManifest()).toEqual(manifestBytes);
  });

  it("G5 simulates staged blob-then-manifest commit", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    const manifestBytes = serializeDomdocPackageManifestStub(base);
    const blobBytes = new TextEncoder().encode("native-checkpoint-stub");
    const sim = simulateDomdocCrashSafeStagedWrite(plan, blobBytes, manifestBytes);
    expect(sim.ok).toBe(true);
    expect(sim.committedManifest).toBe(true);
    const verifyIdx = sim.steps.findIndex((s) => s.step === "verify-blob-bytes");
    const commitIdx = sim.steps.findIndex((s) => s.step === "commit-indexeddb-manifest-transaction");
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(verifyIdx);
  });

  it("M1/F42 fenced tab writer rejects stale tab and stale fence on save", () => {
    const session = createDocumentSession(base);
    const store = new MemoryDomdocBlobStoreStub();
    const tabA = session.tryAcquireTabWriterLease("tab-a");
    expect(tabA.ok).toBe(true);
    if (!tabA.ok) return;
    const blocked = session.saveDomdocPackageStubToStore(store, {
      writerTabId: "tab-b",
      writerFenceGeneration: tabA.fenceGeneration,
    });
    expect(blocked.simulation.ok).toBe(false);
    expect(blocked.simulation.detail).toBe("fenced-tab-writer-other-tab-active");
    const ok = session.saveDomdocPackageStubToStore(store, {
      writerTabId: "tab-a",
      writerFenceGeneration: tabA.fenceGeneration,
    });
    expect(ok.simulation.ok).toBe(true);
    const staleGen = session.saveDomdocPackageStubToStore(store, {
      writerTabId: "tab-a",
      writerFenceGeneration: tabA.fenceGeneration - 1,
    });
    expect(staleGen.simulation.detail).toBe("fenced-tab-writer-stale-fence-generation");
  });

  it("M1 round-trips open/save domdoc package stub via DocumentSession hooks", () => {
    const session = createDocumentSession(base);
    const store = new MemoryDomdocBlobStoreStub();
    const { manifestBytes, simulation } = session.saveDomdocPackageStubToStore(store);
    expect(simulation.ok).toBe(true);
    const reopened = DocumentSession.openFromDomdocManifestStub(manifestBytes);
    expect(reopened.documentId).toBe(base.documentId);
    expect(reopened.revisions.committedRevision).toBe(base.revisions.committedRevision);
    expect(reopened.revisions.persistedRevision).toBe(base.revisions.committedRevision);
    const roundTripBytes = serializeDomdocPackageManifestStub({
      documentId: reopened.documentId,
      kind: reopened.stub.kind,
      revisions: reopened.revisions,
    });
    expect(parseDomdocPackageManifestStub(roundTripBytes).documentId).toBe(base.documentId);
    expect(store.readCommittedManifest()).toEqual(manifestBytes);
  });

  it("M3/F34 connects review accept to OOXML patch on minimal tracked DOCX fixture", () => {
    const zip = buildReviewMinimalTrackedDocxZipBytes();
    const pkg = readOpcPackage(zip);
    const documentXml = new TextDecoder().decode(pkg.members.get("word/document.xml")!);
    const marks = parseReviewSuggestionMarksFromDocumentXml(documentXml);
    expect(marks.some((m) => m.suggestionId === "10")).toBe(true);

    const session = createDocumentSession(base);
    const { session: next, patch } = session.applyReviewSuggestionOpcPatch(pkg, "10", "accept");
    expect(patch.decision.applied).toBe(true);
    expect(patch.documentXml).toContain('domdoc:review-decision id="10" decision="accept"');
    expect(next.revisions.committedRevision).toBe(2);
    const roundTrip = new TextDecoder().decode(
      patch.pkg.members.get("word/document.xml")!,
    );
    expect(roundTrip).toContain("domdoc:review-decision");
  });

  it("M3/F34 applies review reject on minimal tracked DOCX without projection bump", () => {
    const pkg = readOpcPackage(buildReviewMinimalTrackedDocxZipBytes());
    const session = createDocumentSession(base);
    const { session: next, patch } = session.applyReviewSuggestionOpcPatch(pkg, "10", "reject");
    expect(patch.decision.applied).toBe(true);
    expect(patch.documentXml).toContain('decision="reject"');
    expect(next.revisions.committedRevision).toBe(base.revisions.committedRevision);
  });

  it("patches numbering.xml when committing list renumber", () => {
    const session = createDocumentSession(base);
    const pkg = readOpcPackage(writeOpcPackage({ members: new Map() }));
    const { session: next, pkg: patched } = session.applyDocxListRenumberOpcPatch(pkg, {
      kind: "docx-list-renumber-stub",
      numId: 2,
      markers: ["1. "],
    });
    expect(next.revisions.committedRevision).toBe(2);
    const xml = new TextDecoder().decode(patched.members.get(DOCX_NUMBERING_PART)!);
    expect(xml).toContain("domdoc:list-renumber");
  });
});
