import type { CaretMove, Location, PageView, Pos, RunView } from "./engine-types.js";
import { hitTest, isAddressable, lineOf, runBox, sameLine, visibleLength, wordBoundary } from "./geometry.js";

export type { CaretMove };

/** The document queries caret movement needs (implemented by `FiledomDocument`). */
export interface NavigableDocument {
  info(): { pageCount: number };
  page(index: number): PageView;
  unitText(unit: string): string;
  locate(pos: Pos): Location | undefined;
}

export interface MoveResult {
  pos: Pos;
  /** Horizontal position to keep while moving up/down through lines of different length. */
  goalX?: number;
}

const length = (doc: NavigableDocument, unit: string) => Array.from(doc.unitText(unit)).length;

function firstRun(runs: RunView[]): RunView | undefined {
  return runs.find(isAddressable);
}

function lastRun(runs: RunView[]): RunView | undefined {
  for (let i = runs.length - 1; i >= 0; i--) if (isAddressable(runs[i]!)) return runs[i];
  return undefined;
}

/** The unit before (`-1`) or after (`1`) `unit` in page order, searching adjacent pages. */
export function adjacentUnit(doc: NavigableDocument, unit: string, page: number, direction: 1 | -1): string | undefined {
  const count = doc.info().pageCount;
  let runs = doc.page(page).runs;
  const indices = runs.flatMap((r, i) => (r.unit === unit ? [i] : []));
  let i = direction > 0 ? (indices[indices.length - 1] ?? -1) + 1 : (indices[0] ?? runs.length) - 1;
  for (let p = page; p >= 0 && p < count; p += direction) {
    if (p !== page) {
      runs = doc.page(p).runs;
      i = direction > 0 ? 0 : runs.length - 1;
    }
    for (; i >= 0 && i < runs.length; i += direction) {
      const run = runs[i]!;
      if (isAddressable(run) && run.unit !== unit) return run.unit;
    }
  }
  return undefined;
}

export function documentStart(doc: NavigableDocument): Pos | undefined {
  const count = doc.info().pageCount;
  for (let p = 0; p < count; p++) {
    const run = firstRun(doc.page(p).runs);
    if (run) return { unit: run.unit, offset: 0 };
  }
  return undefined;
}

export function documentEnd(doc: NavigableDocument): Pos | undefined {
  for (let p = doc.info().pageCount - 1; p >= 0; p--) {
    const run = lastRun(doc.page(p).runs);
    if (run) return { unit: run.unit, offset: length(doc, run.unit) };
  }
  return undefined;
}

/** True when the run's baseline lies inside the caret's line box. */
const onLine = (run: RunView, at: Location) => run.yPt >= at.yPt && run.yPt <= at.yPt + at.heightPt;

function lineBounds(doc: NavigableDocument, pos: Pos, at: Location): [number, number] | undefined {
  const runs = doc.page(at.page).runs;
  const index = runs.findIndex(
    (r) => r.unit === pos.unit && onLine(r, at) && pos.offset >= r.unitStart && pos.offset <= r.unitStart + visibleLength(r),
  );
  if (index < 0) return undefined;
  const line = lineOf(runs, index).map((i) => runs[i]!);
  const start = Math.min(...line.map((r) => r.unitStart));
  let end = Math.max(...line.map((r) => r.unitStart + visibleLength(r)));
  const last = line.reduce((a, b) => (b.xPt > a.xPt ? b : a));
  // A wrapped line ends with its break space; End stops before it like a word processor.
  if (end < length(doc, pos.unit) && /\s$/u.test(last.text)) end -= 1;
  return [start, end];
}

function vertical(doc: NavigableDocument, at: Location, goalX: number, direction: 1 | -1): Pos | undefined {
  const count = doc.info().pageCount;
  const beyond = (r: RunView) => (direction < 0 ? r.yPt < at.yPt : r.yPt > at.yPt + at.heightPt);
  let runs = doc.page(at.page).runs.filter((r) => isAddressable(r) && beyond(r));
  let page = at.page;
  while (!runs.length) {
    page += direction;
    if (page < 0 || page >= count) return undefined;
    runs = doc.page(page).runs.filter(isAddressable);
  }
  const nearest = runs.reduce((a, b) => ((direction < 0 ? b.yPt > a.yPt : b.yPt < a.yPt) ? b : a));
  const line = runs.filter((r) => sameLine(r, nearest));
  const box = runBox(nearest);
  return hitTest(line, goalX, box.yPt + box.heightPt / 2)?.pos;
}

/** Where the caret goes for `move` from `pos`. Returns `pos` when it cannot move. */
export function moveCaret(doc: NavigableDocument, pos: Pos, move: CaretMove, goalX?: number): MoveResult {
  const at = doc.locate(pos);
  const same = { pos };
  switch (move) {
    case "docStart":
      return { pos: documentStart(doc) ?? pos };
    case "docEnd":
      return { pos: documentEnd(doc) ?? pos };
    case "left":
    case "wordLeft": {
      if (pos.offset > 0) {
        const offset = move === "left" ? pos.offset - 1 : wordBoundary(doc.unitText(pos.unit), pos.offset, -1);
        return { pos: { unit: pos.unit, offset } };
      }
      const prev = at && adjacentUnit(doc, pos.unit, at.page, -1);
      return prev ? { pos: { unit: prev, offset: length(doc, prev) } } : same;
    }
    case "right":
    case "wordRight": {
      const len = length(doc, pos.unit);
      if (pos.offset < len) {
        const offset = move === "right" ? pos.offset + 1 : wordBoundary(doc.unitText(pos.unit), pos.offset, 1);
        return { pos: { unit: pos.unit, offset } };
      }
      const next = at && adjacentUnit(doc, pos.unit, at.page, 1);
      return next ? { pos: { unit: next, offset: 0 } } : same;
    }
    case "lineStart":
    case "lineEnd": {
      const bounds = at && lineBounds(doc, pos, at);
      if (!bounds) return same;
      return { pos: { unit: pos.unit, offset: move === "lineStart" ? bounds[0] : bounds[1] } };
    }
    case "up":
    case "down": {
      if (!at) return same;
      const x = goalX ?? at.xPt;
      const target = vertical(doc, at, x, move === "up" ? -1 : 1);
      if (target) return { pos: target, goalX: x };
      const edge = move === "up" ? documentStart(doc) : documentEnd(doc);
      return { pos: edge ?? pos, goalX: x };
    }
  }
}
