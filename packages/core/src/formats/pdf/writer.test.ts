import { describe, expect, it } from "vitest";
import { buildStubSourceMap, resolveRunAtOffset } from "./source-map.js";
import { createPdfWriterSession, sha256 } from "./writer.js";

const MINIMAL_PDF = new Uint8Array([
  ...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n"),
]);

describe("pdf source-map stub", () => {
  it("resolves character offset within a single run", () => {
    const map = buildStubSourceMap(0, "hello", 1);
    const run = resolveRunAtOffset(map, 2);
    expect(run?.objectId).toBe("stub-obj-0-0");
  });
});

describe("pdf writer session (no PDFium)", () => {
  it("preflights minimal PDF bytes with unsupported native capabilities", async () => {
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 1,
    });
    const result = await session.preflight(MINIMAL_PDF);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.capabilities.nativeTextReplace).toBe("unsupported");
      expect(result.capabilities.reason).toBe("backend-not-configured");
    }
    await session.dispose();
  });

  it("P11: failed apply rolls back and does not advance materialization", async () => {
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 3,
    });
    const apply = await session.apply([
      {
        kind: "replaceTextRun",
        pageIndex: 0,
        objectId: "stub-obj-0-0",
        newText: "replaced",
        expectedRevision: 3,
      },
    ]);
    expect(apply.ok).toBe(false);
    if (!apply.ok) {
      expect(apply.rolledBack).toBe(true);
      expect(apply.code).toBe("backend-not-configured");
    }
    const save = await session.save();
    expect(save.ok).toBe(false);
    await session.dispose();
  });

  it("P12 subset: dispose clears context; further apply is rejected", async () => {
    const session = await createPdfWriterSession(MINIMAL_PDF, {
      expectedRevision: 0,
    });
    await session.dispose();
    const apply = await session.apply([]);
    expect(apply.ok).toBe(false);
  });

  it("checkpoint hash tracks source bytes", () => {
    expect(sha256(MINIMAL_PDF)).toHaveLength(64);
  });
});
