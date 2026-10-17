import { describe, expect, it } from "vitest";
import { replaceDocumentParagraphs } from "./document-find-replace.js";

describe("F140 find/replace", () => {
  it("replaces all story matches and reports count", () => {
    const result = replaceDocumentParagraphs(["alpha beta", "alpha"], "alpha", "gamma");
    expect(result.replacementCount).toBe(2);
    expect(result.paragraphTexts).toEqual(["gamma beta", "gamma"]);
  });
});
