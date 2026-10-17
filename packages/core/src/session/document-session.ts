import type { DocumentSessionStub, SessionRevisions } from "../wire/domain-owned.js";
import {
  applyProjectionTransactionStub,
  type DocxProjectionTransactionStub,
} from "../formats/docx/docx-prosemirror-transaction-boundary.js";
import {
  applyDocxListRenumberStub,
  type DocxListRenumberMutation,
} from "../formats/docx/docx-session-list-mutation.js";
import type { OpcPackage } from "../formats/docx/opc-package.js";
import { applyListRenumberToOpcPackage } from "../formats/docx/docx-numbering-opc-patch.js";
import {
  applyReviewSuggestionDecisionFromDocumentXml,
  type ReviewSuggestionOpcPatchResult,
} from "../formats/docx/review-suggestion-opc-patch-stub.js";
import type { ReviewSuggestionDecision } from "../formats/docx/review-suggestion-accept-reject-stub.js";
import type { ListParagraphMeta } from "../formats/docx/docx-list-numbering-stub.js";
import { applyDocxNumberingWriteBackFromSession } from "../formats/docx/docx-numbering-body-writeback.js";
import type { DocxNumberingSessionWriteBackOptions } from "../formats/docx/docx-numbering-session-writeback.js";
import {
  createDomdocPackagePersistPlanStub,
  MemoryDomdocBlobStoreStub,
  parseDomdocPackageManifestStub,
  serializeDomdocPackageManifestStub,
  type DomdocStagedWriteSimulationResult,
} from "../persistence/domdoc-package-stub.js";
import {
  FencedTabWriterOwnershipStub,
  type FencedTabWriterAcquireResult,
} from "./fenced-tab-writer-stub.js";

/** M1 skeleton — web-owned semantic authority (blueprint §13.1). */
export class DocumentSession {
  private tabWriterOwnership: FencedTabWriterOwnershipStub | null = null;

  constructor(readonly stub: DocumentSessionStub) {}

  get documentId(): string {
    return this.stub.documentId;
  }

  get revisions(): SessionRevisions {
    return this.stub.revisions;
  }

  commitDocxProjectionStub(stub: DocxProjectionTransactionStub): DocumentSession {
    return new DocumentSession({
      ...this.stub,
      revisions: applyProjectionTransactionStub(this.stub.revisions, stub),
    });
  }

  commitDocxListRenumberStub(mutation: DocxListRenumberMutation): DocumentSession {
    return new DocumentSession({
      ...this.stub,
      revisions: applyDocxListRenumberStub(this.stub.revisions, mutation),
    });
  }

  /** G2-DOCX-06: apply list renumber session slice to OPC numbering.xml (stub marker). */
  applyDocxListRenumberOpcPatch(
    pkg: OpcPackage,
    mutation: DocxListRenumberMutation,
  ): { session: DocumentSession; pkg: OpcPackage } {
    const session = this.commitDocxListRenumberStub(mutation);
    return {
      session,
      pkg: applyListRenumberToOpcPackage(pkg, mutation),
    };
  }

  /** G2-DOCX-11: OPC numbering write-back from session list paragraph state. */
  /** M1/G5: open session stub from committed manifest.json bytes (.domdoc package hook). */
  static openFromDomdocManifestStub(manifestBytes: Uint8Array): DocumentSession {
    const manifest = parseDomdocPackageManifestStub(manifestBytes);
    return new DocumentSession({
      documentId: manifest.documentId,
      kind: manifest.kind,
      revisions: {
        committedRevision: manifest.committedRevision,
        persistedRevision: manifest.committedRevision,
        materializedRevision: manifest.nativeCheckpointRevision,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: manifest.committedRevision,
      },
    });
  }

  /** §13.2 fenced tab writer stub — one active persist lease per document in this session shell. */
  fencedTabWriterOwnership(): FencedTabWriterOwnershipStub {
    if (!this.tabWriterOwnership) {
      this.tabWriterOwnership = new FencedTabWriterOwnershipStub(this.documentId);
    }
    return this.tabWriterOwnership;
  }

  tryAcquireTabWriterLease(tabId: string): FencedTabWriterAcquireResult {
    return this.fencedTabWriterOwnership().tryAcquire(tabId);
  }

  /** M1/G5: crash-safe multi-blob save hook into in-memory store stub (host persist adapter TBD). */
  saveDomdocPackageStubToStore(
    store: MemoryDomdocBlobStoreStub,
    options?: {
      journalBytes?: Uint8Array;
      checkpointBytes?: Uint8Array;
      writerTabId?: string;
      writerFenceGeneration?: number;
    },
  ): { manifestBytes: Uint8Array; simulation: DomdocStagedWriteSimulationResult } {
    if (options?.writerTabId !== undefined && options.writerFenceGeneration !== undefined) {
      const fence = this.fencedTabWriterOwnership().assertWriterFence(
        options.writerTabId,
        options.writerFenceGeneration,
      );
      if (!fence.ok) {
        return {
          manifestBytes: new Uint8Array(),
          simulation: {
            ok: false,
            steps: [],
            committedManifest: false,
            detail: `fenced-tab-writer-${fence.reason}`,
          },
        };
      }
    }
    const plan = createDomdocPackagePersistPlanStub(this.stub);
    const manifestBytes = serializeDomdocPackageManifestStub(this.stub);
    const journalBytes =
      options?.journalBytes ??
      new TextEncoder().encode(
        `{"documentId":"${this.stub.documentId}","rev":${this.stub.revisions.committedRevision}}\n`,
      );
    const checkpointBytes =
      options?.checkpointBytes ?? new TextEncoder().encode("native-checkpoint-stub");
    const simulation = store.applyMultiBlobStagedWrite(
      {
        "source/native-checkpoint.bin": checkpointBytes,
        "state/semantic-journal.jsonl": journalBytes,
      },
      plan,
      manifestBytes,
    );
    return { manifestBytes, simulation };
  }

  applyDocxNumberingOpcWriteBackFromSession(
    pkg: OpcPackage,
    paragraphs: readonly ListParagraphMeta[],
    options?: DocxNumberingSessionWriteBackOptions,
  ): { session: DocumentSession; pkg: OpcPackage } {
    const markers = paragraphs.filter((p) => p.numId > 0);
    const session =
      markers.length > 0
        ? this.commitDocxListRenumberStub({
            kind: "docx-list-renumber-stub",
            numId: markers[0]!.numId,
            markers: markers.map((p) => `${p.numId}:${p.ilvl}`),
          })
        : this;
    return {
      session,
      pkg: applyDocxNumberingWriteBackFromSession(pkg, paragraphs, options),
    };
  }

  /** M2/F34: review accept/reject stamped into OPC document.xml (stub marker). */
  applyReviewSuggestionOpcPatch(
    pkg: OpcPackage,
    suggestionId: string,
    decision: ReviewSuggestionDecision,
  ): { session: DocumentSession; patch: ReviewSuggestionOpcPatchResult } {
    const patch = applyReviewSuggestionDecisionFromDocumentXml(pkg, suggestionId, decision);
    const session =
      patch.decision.applied && patch.decision.decision === "accept"
        ? this.commitDocxProjectionStub({
            kind: "docx-projection-sync",
            targetRevision: this.revisions.committedRevision + 1,
            paragraphTexts: [patch.decision.resultingPlainText],
            listMarkers: [],
            listNumIds: [],
            listIlvls: [],
          })
        : this;
    return { session, patch };
  }
}

export function createDocumentSession(stub: DocumentSessionStub): DocumentSession {
  return new DocumentSession(stub);
}
