import { readCommentsPartStub, type CommentsPartStub } from "./comments-part-stub.js";
import {
  findRelationshipByType,
  parseRelationshipsXml,
  type OpcRelationship,
} from "./opc-relationships.js";
import {
  getMemberUtf8,
  memberBytesIdentical,
  readOpcPackage,
  setMemberUtf8,
  writeOpcPackage,
  type OpcPackage,
} from "./opc-package.js";
import { PreservationBag } from "./preservation-bag.js";
import {
  parseDocumentBodyXml,
  patchParagraphText,
  serializeMinimalDocumentXml,
  type OoxmlNode,
} from "./ooxml-tree.js";

export interface DocxStoreSnapshot {
  untouchedMemberPaths: string[];
  documentBody: OoxmlNode;
  rootRelationships: OpcRelationship[];
  documentRelationships: OpcRelationship[];
  commentsStub: CommentsPartStub;
  preservationBagPaths: string[];
}

export class DocxStore {
  private readonly originalBytes: Map<string, Uint8Array> = new Map();
  private readonly preservation = new PreservationBag();
  private pkg: OpcPackage;
  private body: OoxmlNode;
  private readonly rootRelationships: OpcRelationship[];
  private readonly documentRelationships: OpcRelationship[];
  private readonly commentsStub: CommentsPartStub;

  private constructor(
    pkg: OpcPackage,
    body: OoxmlNode,
    rootRelationships: OpcRelationship[],
    documentRelationships: OpcRelationship[],
    commentsStub: CommentsPartStub,
  ) {
    this.pkg = pkg;
    for (const [path, bytes] of pkg.members) {
      this.originalBytes.set(path, bytes.slice());
      if (path !== "word/document.xml") {
        this.preservation.seal(path);
      }
    }
    this.body = body;
    this.rootRelationships = rootRelationships;
    this.documentRelationships = documentRelationships;
    this.commentsStub = commentsStub;
  }

  static open(zipBytes: Uint8Array): DocxStore {
    const pkg = readOpcPackage(zipBytes);
    const xml = getMemberUtf8(pkg, "word/document.xml");
    const body = parseDocumentBodyXml(xml);
    const rootRelationships = parseRelationshipsXml(getMemberUtf8(pkg, "_rels/.rels"));
    const documentRelationships = pkg.members.has("word/_rels/document.xml.rels")
      ? parseRelationshipsXml(getMemberUtf8(pkg, "word/_rels/document.xml.rels"))
      : [];
    const commentsStub = readCommentsPartStub(pkg.members);
    return new DocxStore(
      pkg,
      body,
      rootRelationships,
      documentRelationships,
      commentsStub,
    );
  }

  getRootRelationships(): readonly OpcRelationship[] {
    return this.rootRelationships;
  }

  getDocumentRelationships(): readonly OpcRelationship[] {
    return this.documentRelationships;
  }

  getCommentsStub(): CommentsPartStub {
    return this.commentsStub;
  }

  /** Resolved part path for the comments relationship, if declared. */
  commentsPartPath(): string | undefined {
    const rel = findRelationshipByType(
      this.documentRelationships,
      "/relationships/comments",
    );
    if (!rel || rel.targetMode === "External") return undefined;
    return rel.target.startsWith("/")
      ? rel.target.slice(1)
      : `word/${rel.target.replace(/^\.\//, "")}`;
  }

  getBody(): OoxmlNode {
    return this.body;
  }

  patchParagraph(nodeId: string, text: string): boolean {
    if (!patchParagraphText(this.body, nodeId, text)) return false;
    const xml = serializeMinimalDocumentXml(this.body);
    setMemberUtf8(this.pkg, "word/document.xml", xml);
    return true;
  }

  /** D01/D03: sealed OPC members match original decompressed bytes. */
  verifyUntouchedMembers(): string[] {
    const failures: string[] = [];
    for (const path of this.preservation.sealedPaths()) {
      const original = this.originalBytes.get(path);
      const current = this.pkg.members.get(path);
      if (!original || !current || !memberBytesIdentical(original, current)) {
        failures.push(path);
      }
    }
    return failures;
  }

  exportBytes(): Uint8Array {
    return writeOpcPackage(this.pkg);
  }

  snapshot(): DocxStoreSnapshot {
    return {
      untouchedMemberPaths: this.preservation.sealedPaths(),
      documentBody: this.body,
      rootRelationships: [...this.rootRelationships],
      documentRelationships: [...this.documentRelationships],
      commentsStub: this.commentsStub,
      preservationBagPaths: this.preservation.sealedPaths(),
    };
  }
}
