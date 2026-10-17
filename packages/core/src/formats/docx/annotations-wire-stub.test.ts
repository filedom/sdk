import { describe, expect, it } from "vitest";
import {
  ANNOTATIONS_FEATURE_REGISTRY_ID,
  buildAnnotationsWireStubFromOpcMembers,
} from "./annotations-wire-stub.js";

describe("F20 annotations wire stub", () => {
  it("binds OPC comments part to feature registry id F20", () => {
    const members = new Map<string, Uint8Array>();
    members.set(
      "word/comments.xml",
      new TextEncoder().encode(`<w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`),
    );
    const wire = buildAnnotationsWireStubFromOpcMembers(members);
    expect(wire.featureId).toBe(ANNOTATIONS_FEATURE_REGISTRY_ID);
    expect(wire.surface).toBe("read-only-d04");
    expect(wire.comments.present).toBe(true);
    expect(wire.comments.commentCount).toBe(1);
  });
});
