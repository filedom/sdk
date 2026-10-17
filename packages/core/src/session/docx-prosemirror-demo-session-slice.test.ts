import { describe, expect, it } from "vitest";
import {
  applyDemoProsemirrorTextReplace,
  buildDemoDocxZipBytes,
  openDocxProsemirrorDemoSessionSlice,
} from "./docx-prosemirror-demo-session-slice.js";
import { proseMirrorParagraphTexts } from "../formats/docx/docx-prosemirror-projection.js";

describe("ProseMirror demo session slice (F21)", () => {
  it("opens store projection and commits text edit to DocumentSession", () => {
    const zip = buildDemoDocxZipBytes("hello");
    const slice = openDocxProsemirrorDemoSessionSlice(zip, {
      documentId: "demo-doc",
      kind: "flow",
      revisions: {
        committedRevision: 0,
        persistedRevision: 0,
        materializedRevision: 0,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 0,
      },
    });
    expect(proseMirrorParagraphTexts(slice.doc)).toEqual(["hello"]);
    const edited = applyDemoProsemirrorTextReplace(slice, 0, "hello domdoc");
    expect(proseMirrorParagraphTexts(edited.doc)).toEqual(["hello domdoc"]);
    expect(edited.session.revisions.committedRevision).toBe(1);
  });
});
