import { describe, expect, it } from "vitest";
import { fileIconName } from "./formats.js";

describe("file icon", () => {
  it("uses a type icon when the kind has one, otherwise the plain file mark", () => {
    expect(fileIconName("notes.pdf", "pdf")).toBe("file");
    expect(fileIconName("shot.png", "png")).toBe("image");
    expect(fileIconName("clip.mp4", "mp4")).toBe("video");
    expect(fileIconName("src/App.tsx")).toBe("code");
    expect(fileIconName("untitled")).toBe("file");
  });
});
