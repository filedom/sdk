import { describe, expect, it } from "vitest";
import { buildDebugReport, caretUnits, unitsInAction, unitsMentioned, type DebugSnapshot } from "./debug-report.js";
import { FiledomError } from "./errors.js";

function snapshot(patch: Partial<DebugSnapshot> = {}): DebugSnapshot {
  return {
    error: {
      code: "read-only",
      detail: "paragraph t0r31 contains native content that is preserved but not editable",
      message: "read-only: paragraph t0r31 contains native content that is preserved but not editable",
    },
    viewMode: "live",
    readOnly: false,
    zoom: "100%",
    file: { name: "report.docx", format: "docx", id: "file-1", bytes: 4096 },
    warnings: [],
    selection: { anchor: "t0r30:4", focus: "t0r31:0", text: "\n", ranges: [{ unit: "t0r30", start: 4, end: 12 }, { unit: "t0r31", start: 0, end: 0 }] },
    failedAction: { type: "text", text: "\n" },
    recent: [{ type: "text", text: "\n" }],
    units: [
      {
        unit: "t0r31",
        page: 1,
        location: "x 72 y 400 h 14",
        editable: true,
        text: "Total",
        runs: [
          {
            id: "r1",
            unitStart: 0,
            text: "Total",
            editable: true,
            font: "Calibri",
            fontSizePt: 12,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
          },
        ],
      },
    ],
    pageMates: [{ page: 1, units: [{ unit: "t0r30", editable: true, text: "Amount" }] }],
    ...patch,
  };
}

describe("debug report", () => {
  it("names the paragraph and the checks that reject native content", () => {
    const report = buildDebugReport(snapshot());
    expect(report.startsWith("Debug and fix this error")).toBe(true);
    expect(report).toContain("paragraph t0r31 contains native content that is preserved but not editable");
    expect(report).toContain("wasm/crates/core/src/flow/edit.rs");
    expect(report).toContain("wasm/crates/open/src/office.rs");
    expect(report).toContain("mergeable");
    expect(report).toContain("report.docx");
    expect(report).toContain('"type": "text"');
    expect(report).toContain("### t0r31");
    expect(report).toContain("editable=true");
    expect(report).toContain("t0r30");
    expect(unitsMentioned(snapshot().error.detail)).toEqual(["t0r31"]);
    expect(caretUnits({ anchor: "0:42:3", focus: "t0r31:0" })).toEqual(["0:42", "t0r31"]);
    expect(unitsInAction({ type: "replace", from: { unit: "t0r30", offset: 1 }, to: { unit: "t0r31", offset: 0 }, text: "\n" })).toEqual([
      "t0r30",
      "t0r31",
    ]);
  });

  it("keeps the original stack when an engine message is wrapped", () => {
    const cause = new Error("read-only: p3 cannot be edited");
    const error = FiledomError.from(cause);
    expect(error.stack).toBe(cause.stack);
    expect(error.code).toBe("read-only");
  });

  it("points a pdf-render decryption paint at the open password path", () => {
    const report = buildDebugReport(
      snapshot({
        error: {
          code: "pdf-render",
          detail: "Decryption(PasswordProtected)",
          message: "pdf-render: Decryption(PasswordProtected)",
        },
        file: { name: "locked.pdf", format: "pdf", id: "file-1", bytes: 4096 },
        selection: undefined,
        failedAction: { type: "paint", page: 0 },
        units: [],
        pageMates: [],
      }),
    );
    expect(report).toContain("Decryption(PasswordProtected)");
    expect(report).toContain("crates/open/src/pdf.rs");
    expect(report).toContain("password-prompt.ts");
  });
});
