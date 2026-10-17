import { describe, expect, it } from "vitest";
import {
  applyOversizePolicy,
  contentWidthPt,
  logicalWidthUnchangedByZoom,
  paginateSemanticTable,
  percentContentWidthPt,
  placeAtomicCard,
  semanticTableRowIdsStable,
} from "./fragmentation-c01-c04-feasibility.js";

describe("G4 C01–C04 feasibility (web measurement contract; gate not-run)", () => {
  it("C01 full content width is 480 pt and 50% is 240 pt, unchanged by zoom", () => {
    expect(contentWidthPt()).toBe(480);
    expect(percentContentWidthPt(50)).toBe(240);
    expect(logicalWidthUnchangedByZoom(2)).toBe(480);
    expect(logicalWidthUnchangedByZoom(0.5)).toBe(480);
  });

  it("C02 atomic card moves once to the next page without an empty-page loop", () => {
    const placement = placeAtomicCard({
      remainingPt: 40,
      cardHeightPt: 80,
      pageContentHeightPt: 200,
    });
    expect(placement.pageIndex).toBe(1);
    expect(placement.movedOnce).toBe(true);
    expect(placement.emptyPageLoop).toBe(false);
  });

  it("C03 oversize scroll policy does not drop print content", () => {
    const verdict = applyOversizePolicy(
      { width: 500, height: 900 },
      { width: 480, height: 200 },
      "scroll",
    );
    expect(verdict.droppedHiddenPrintContent).toBe(false);
    expect(verdict.detail).toContain("print");
  });

  it("C04 paginates 300 rows with stable ids, repeated headers, and one editable owner", () => {
    const header = { rowId: "hdr", cells: ["A"] };
    const rows = Array.from({ length: 300 }, (_, i) => ({
      rowId: `row-${i}`,
      cells: [`c${i}`],
    }));
    expect(semanticTableRowIdsStable(rows)).toBe(true);
    const { fragments, tokens } = paginateSemanticTable({ header, rows, rowsPerPage: 40 });
    expect(fragments.reduce((n, f) => n + f.rowIds.length, 0)).toBe(300);
    expect(fragments.every((f) => f.headerRowIds[0] === "hdr")).toBe(true);
    expect(new Set(fragments.map((f) => f.editableOwnerFragment)).size).toBe(1);
    expect(tokens.every((t) => t.sourceEnd > t.sourceStart)).toBe(true);
  });
});
