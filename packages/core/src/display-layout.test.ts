import { describe, expect, it } from "vitest";
import { defaultDisplayLayout } from "./display-layout.js";

describe("display layout", () => {
  it("gives each file a default layout", () => {
    expect(defaultDisplayLayout("src/app.ts")).toBe("numbered");
    expect(defaultDisplayLayout("notes.txt")).toBe("numbered");
    expect(defaultDisplayLayout("quarterly-report.pdf", "pdf")).toBe("paginated");
    expect(defaultDisplayLayout("budget.docx", "docx")).toBe("paginated");
    expect(defaultDisplayLayout("slides.pptx", "pptx")).toBe("paginated");
    expect(defaultDisplayLayout("photo.png", "png")).toBe("frame");
    expect(defaultDisplayLayout("clip.mp4", "mp4")).toBe("frame");
    expect(defaultDisplayLayout("song.mp3", "mp3")).toBe("frame");
    expect(defaultDisplayLayout("mail.eml", "eml")).toBe("frame");
  });
});
