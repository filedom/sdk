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
import type { ListParagraphMeta } from "../formats/docx/docx-list-numbering-stub.js";
import {
  writeNumberingOpcFromSessionListState,
  type DocxNumberingSessionWriteBackOptions,
} from "../formats/docx/docx-numbering-session-writeback.js";

/** M1 skeleton — web-owned semantic authority (blueprint §13.1). */
export class DocumentSession {
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
      pkg: writeNumberingOpcFromSessionListState(pkg, paragraphs, options),
    };
  }
}

export function createDocumentSession(stub: DocumentSessionStub): DocumentSession {
  return new DocumentSession(stub);
}
