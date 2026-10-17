import type { DocumentSessionStub, SessionRevisions } from "../wire/domain-owned.js";
import {
  applyProjectionTransactionStub,
  type DocxProjectionTransactionStub,
} from "../formats/docx/docx-prosemirror-transaction-boundary.js";
import {
  applyDocxListRenumberStub,
  type DocxListRenumberMutation,
} from "../formats/docx/docx-session-list-mutation.js";

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
}

export function createDocumentSession(stub: DocumentSessionStub): DocumentSession {
  return new DocumentSession(stub);
}
