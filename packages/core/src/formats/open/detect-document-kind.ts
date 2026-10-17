/** F02 format detection from magic bytes + optional MIME/filename hints. */

export type DetectedDocumentKind =
  | "docx"
  | "pdf"
  | "domdoc"
  | "encrypted-unsupported"
  | "unknown";

export interface DocumentKindDetection {
  kind: DetectedDocumentKind;
  adapter: "docx" | "pdf" | "package" | "none";
  confidence: "magic" | "hint" | "none";
  diagnostics: readonly string[];
}

const PDF_MAGIC = new TextEncoder().encode("%PDF-");
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0] as const;

function startsWith(bytes: Uint8Array, magic: ArrayLike<number>): boolean {
  if (bytes.byteLength < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

function looksLikeDomdocZip(bytes: Uint8Array): boolean {
  const ascii = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.byteLength, 4096)));
  return ascii.includes("manifest.json") && ascii.includes("source/");
}

function looksLikeDocxZip(bytes: Uint8Array): boolean {
  const ascii = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.byteLength, 4096)));
  return ascii.includes("[Content_Types].xml") || ascii.includes("word/document.xml");
}

function filenameKind(filename?: string): DetectedDocumentKind | undefined {
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".domdoc")) return "domdoc";
  return undefined;
}

function mimeKind(mime?: string): DetectedDocumentKind | undefined {
  if (!mime) return undefined;
  const lower = mime.toLowerCase();
  if (lower.includes("wordprocessingml")) return "docx";
  if (lower === "application/pdf") return "pdf";
  if (lower.includes("domdoc")) return "domdoc";
  return undefined;
}

export function detectDocumentKind(
  bytes: Uint8Array,
  hint?: { mime?: string; filename?: string },
): DocumentKindDetection {
  const diagnostics: string[] = [];
  if (startsWith(bytes, CFB_MAGIC)) {
    return {
      kind: "encrypted-unsupported",
      adapter: "none",
      confidence: "magic",
      diagnostics: ["ole-compound-file (likely encrypted legacy/docx)"],
    };
  }
  if (startsWith(bytes, PDF_MAGIC)) {
    const ascii = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.byteLength, 8192)));
    if (/\/Encrypt\b/.test(ascii)) {
      diagnostics.push("pdf-encrypt-dictionary");
      return {
        kind: "encrypted-unsupported",
        adapter: "pdf",
        confidence: "magic",
        diagnostics,
      };
    }
    return { kind: "pdf", adapter: "pdf", confidence: "magic", diagnostics };
  }
  if (startsWith(bytes, ZIP_MAGIC)) {
    if (looksLikeDomdocZip(bytes)) {
      return { kind: "domdoc", adapter: "package", confidence: "magic", diagnostics };
    }
    if (looksLikeDocxZip(bytes)) {
      return { kind: "docx", adapter: "docx", confidence: "magic", diagnostics };
    }
    diagnostics.push("zip-container-without-known-office-parts");
  }
  const hinted = mimeKind(hint?.mime) ?? filenameKind(hint?.filename);
  if (hinted) {
    diagnostics.push("hint-only-detection");
    return {
      kind: hinted,
      adapter: hinted === "docx" ? "docx" : hinted === "pdf" ? "pdf" : "package",
      confidence: "hint",
      diagnostics,
    };
  }
  return {
    kind: "unknown",
    adapter: "none",
    confidence: "none",
    diagnostics: [...diagnostics, "unsupported-or-corrupt"],
  };
}
