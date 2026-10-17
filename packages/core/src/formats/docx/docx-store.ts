import {
  getMemberUtf8,
  memberBytesIdentical,
  readOpcPackage,
  setMemberUtf8,
  writeOpcPackage,
  type OpcPackage,
} from "./opc-package.js";
import {
  parseDocumentBodyXml,
  patchParagraphText,
  serializeMinimalDocumentXml,
  type OoxmlNode,
} from "./ooxml-tree.js";

export interface DocxStoreSnapshot {
  untouchedMemberPaths: string[];
  documentBody: OoxmlNode;
}

export class DocxStore {
  private readonly originalBytes: Map<string, Uint8Array> = new Map();
  private pkg: OpcPackage;
  private body: OoxmlNode;

  private constructor(pkg: OpcPackage, body: OoxmlNode) {
    this.pkg = pkg;
    for (const [path, bytes] of pkg.members) {
      this.originalBytes.set(path, bytes.slice());
    }
    this.body = body;
  }

  static open(zipBytes: Uint8Array): DocxStore {
    const pkg = readOpcPackage(zipBytes);
    const xml = getMemberUtf8(pkg, "word/document.xml");
    const body = parseDocumentBodyXml(xml);
    return new DocxStore(pkg, body);
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

  /** D01: untouched members match original decompressed bytes. */
  verifyUntouchedMembers(): string[] {
    const failures: string[] = [];
    for (const [path, original] of this.originalBytes) {
      if (path === "word/document.xml") continue;
      const current = this.pkg.members.get(path);
      if (!current || !memberBytesIdentical(original, current)) {
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
      untouchedMemberPaths: [...this.originalBytes.keys()].filter(
        (p) => p !== "word/document.xml",
      ),
      documentBody: this.body,
    };
  }
}
