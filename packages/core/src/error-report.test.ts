import { describe, expect, it } from "vitest";
import { errorBundle, errorEntry, errorMail } from "./error-report.js";

const when = new Date("2026-11-03T18:00:00.000Z");

describe("error mail", () => {
  it("hides the renderer name and gives a sentence a person can send", () => {
    const mail = errorMail("open-failed: PdfiumLibraryInternalError(load failed)", {
      fileName: "notes.pdf",
      now: when,
      page: "https://filedom.io/live",
      browser: "TestBrowser",
    });
    expect(mail.summary).toBe("The file did not open.");
    expect(mail.report).toContain("Reference: open-failed");
    expect(mail.report).toContain("File: notes.pdf");
    expect(mail.report).toContain("Send this note with the file.");
    expect(mail.report.toLowerCase()).not.toContain("pdfium");
    expect(`${mail.summary}\n${mail.report}`).not.toMatch(/wasm\/|sdk\/packages|embedpdf/i);
  });

  it("keeps a plain sentence and drops an engine path", () => {
    const mail = errorMail("The file could not be kept in this browser. wasm/crates/open/src/pdf.rs", {
      now: when,
      page: "",
      browser: "",
    });
    expect(mail.summary).toBe("The file could not be kept in this browser.");
    expect(mail.report).not.toMatch(/wasm|pdf\.rs/i);
  });

  it("names an unsupported file without the code", () => {
    const mail = errorMail("unsupported-format: notes.txt", { now: when, page: "", browser: "" });
    expect(mail.summary).toBe("This file cannot be opened.");
    expect(mail.report).toContain("Reference: unsupported-format");
    expect(mail.report).not.toContain("notes.txt: ");
  });

  it("says when a file needs a password", () => {
    const mail = errorMail("pdf-encrypted: password required", { now: when, page: "", browser: "" });
    expect(mail.summary).toBe("This file needs a password.");
  });

  it("keeps engine context for one error and for the whole list", () => {
    const context = "code: unsupported\nSearch sdk/packages/core/src/viewer.ts and wasm/crates/open/src/pdf.rs";
    const entry = errorEntry("unsupported: text formatting", { fileName: "notes.pdf", now: when, page: "", browser: "" }, context);
    expect(entry.summary).toBe("This file cannot do that.");
    expect(entry.report).toContain("Summary: This file cannot do that.");
    expect(entry.report).toContain("sdk/packages/core/src/viewer.ts");
    expect(entry.report).toContain("wasm/crates/open/src/pdf.rs");
    const plain = errorEntry("unsupported-format: notes.txt", { now: when, page: "", browser: "" });
    expect(plain.report).toContain("Reference: unsupported-format");
    expect(plain.report.toLowerCase()).not.toMatch(/wasm\/|sdk\/packages/);
    const bundle = errorBundle([entry, plain]);
    expect(bundle).toContain("There are 2 errors");
    expect(bundle).toContain("# Error 1 of 2");
    expect(bundle).toContain("# Error 2 of 2");
    expect(bundle).toContain(entry.report);
    expect(bundle).toContain(plain.report);
  });
});
