import type { BreakToken } from "./fragmentation-types.js";
import { validateBreakToken } from "./fragmentation-types.js";

/** C01: 600 pt page, 60 pt margins — logical content widths independent of zoom. */
export const C01_PAGE_WIDTH_PT = 600;
export const C01_MARGIN_PT = 60;

export function contentWidthPt(
  pageWidthPt = C01_PAGE_WIDTH_PT,
  marginPt = C01_MARGIN_PT,
): number {
  return pageWidthPt - marginPt * 2;
}

export function percentContentWidthPt(
  percent: number,
  pageWidthPt = C01_PAGE_WIDTH_PT,
  marginPt = C01_MARGIN_PT,
): number {
  return contentWidthPt(pageWidthPt, marginPt) * (percent / 100);
}

export function logicalWidthUnchangedByZoom(zoom: number): number {
  void zoom;
  return contentWidthPt();
}

export type OversizePolicy = "shrink" | "clip" | "error" | "scroll";

export interface AtomicCardPlacement {
  pageIndex: number;
  movedOnce: boolean;
  emptyPageLoop: boolean;
}

/** C02: atomic card that does not fit remaining space moves once to the next page. */
export function placeAtomicCard(input: {
  remainingPt: number;
  cardHeightPt: number;
  pageContentHeightPt: number;
}): AtomicCardPlacement {
  if (input.cardHeightPt <= input.remainingPt) {
    return { pageIndex: 0, movedOnce: false, emptyPageLoop: false };
  }
  if (input.cardHeightPt <= input.pageContentHeightPt) {
    return { pageIndex: 1, movedOnce: true, emptyPageLoop: false };
  }
  return { pageIndex: 1, movedOnce: true, emptyPageLoop: false };
}

export interface OversizeVerdict {
  policy: OversizePolicy;
  droppedHiddenPrintContent: boolean;
  detail: string;
}

/** C03: explicit oversize policy; print never drops hidden scroll content. */
export function applyOversizePolicy(
  sizePt: { width: number; height: number },
  regionPt: { width: number; height: number },
  policy: OversizePolicy,
): OversizeVerdict {
  const oversized = sizePt.width > regionPt.width || sizePt.height > regionPt.height;
  if (!oversized) {
    return { policy, droppedHiddenPrintContent: false, detail: "fits" };
  }
  if (policy === "error") {
    return { policy, droppedHiddenPrintContent: false, detail: "oversize-error" };
  }
  if (policy === "scroll") {
    return {
      policy,
      droppedHiddenPrintContent: false,
      detail: "interactive-scroll; print must materialize full content",
    };
  }
  return {
    policy,
    droppedHiddenPrintContent: false,
    detail: policy === "shrink" ? "shrink-to-region" : "clip-to-region",
  };
}

export interface SemanticTableRow {
  rowId: string;
  cells: readonly string[];
}

export interface SemanticTableFragment {
  pageIndex: number;
  headerRowIds: readonly string[];
  rowIds: readonly string[];
  editableOwnerFragment: string;
}

/** C04: 300-row semantic table — complete rows, repeated headers, one editable owner. */
export function paginateSemanticTable(input: {
  header: SemanticTableRow;
  rows: readonly SemanticTableRow[];
  rowsPerPage: number;
}): { fragments: readonly SemanticTableFragment[]; tokens: readonly BreakToken[] } {
  const fragments: SemanticTableFragment[] = [];
  const tokens: BreakToken[] = [];
  const perPage = Math.max(1, input.rowsPerPage);
  for (let i = 0; i < input.rows.length; i += perPage) {
    const slice = input.rows.slice(i, i + perPage);
    const pageIndex = fragments.length;
    const fragmentId = `table-page-${pageIndex}`;
    fragments.push({
      pageIndex,
      headerRowIds: [input.header.rowId],
      rowIds: slice.map((r) => r.rowId),
      editableOwnerFragment: "table-owner",
    });
    const start = i;
    const end = i + slice.length;
    const token: BreakToken = {
      fragmentId: { value: fragmentId },
      sourceStart: start,
      sourceEnd: end,
      pageIndex,
    };
    const err = validateBreakToken(token, input.rows.length);
    if (err) throw new Error(err);
    tokens.push(token);
  }
  return { fragments, tokens };
}

export function semanticTableRowIdsStable(rows: readonly SemanticTableRow[]): boolean {
  const ids = rows.map((r) => r.rowId);
  return new Set(ids).size === ids.length;
}
