import type { Pos, Rect, RunView, UnitRange } from "./engine-types.js";

/** Line box relative to the baseline, matching the Rust layout (`RUN_ASCENT`, `RUN_LINE_HEIGHT`). */
export const ASCENT = 0.93;
export const LINE_HEIGHT = 1.2;

export const isAddressable = (run: RunView): boolean => run.unit !== "";

/** Characters a run contributes to its unit's visible text (tracked deletions add none). */
export const visibleLength = (run: RunView): number => (run.revision?.kind === "delete" ? 0 : run.advances.length);

function sum(values: number[], from = 0, to = values.length): number {
  let total = 0;
  for (let i = from; i < to; i++) total += values[i]!;
  return total;
}

export function runBox(run: RunView): Rect {
  return {
    xPt: run.xPt,
    yPt: run.yPt - ASCENT * run.fontSizePt,
    widthPt: run.widthPt,
    heightPt: LINE_HEIGHT * run.fontSizePt,
  };
}

/** A caret resolved on a page: its position and the zero-width box to draw. */
export interface Hit {
  pos: Pos;
  /** Index into `runs`. */
  run: number;
  box: Rect;
}

/** Nearest caret to a page point (points, top-left origin). */
export function hitTest(runs: RunView[], xPt: number, yPt: number): Hit | undefined {
  let best: { index: number; score: number } | undefined;
  runs.forEach((run, index) => {
    if (!isAddressable(run)) return;
    const box = runBox(run);
    const dy = yPt < box.yPt ? box.yPt - yPt : yPt > box.yPt + box.heightPt ? yPt - box.yPt - box.heightPt : 0;
    const dx = xPt < box.xPt ? box.xPt - xPt : xPt > box.xPt + box.widthPt ? xPt - box.xPt - box.widthPt : 0;
    const score = dy * 1000 + dx;
    if (!best || score < best.score) best = { index, score };
  });
  if (!best) return undefined;
  const run = runs[best.index]!;
  let local = 0;
  let x = run.xPt;
  for (const advance of run.advances) {
    if (xPt < x + advance / 2) break;
    x += advance;
    local += 1;
  }
  const deleted = visibleLength(run) === 0;
  const box = runBox(run);
  return {
    pos: { unit: run.unit, offset: run.unitStart + (deleted ? 0 : local) },
    run: best.index,
    box: { xPt: x, yPt: box.yPt, widthPt: 0, heightPt: box.heightPt },
  };
}

/**
 * Caret box of `pos` among `runs`, with the same rule as the engine's `locate`: a
 * position at a line wrap belongs to the start of the next line.
 */
export function caretBox(runs: RunView[], pos: Pos): Rect | undefined {
  const contains = (r: RunView) =>
    r.unit === pos.unit && pos.offset >= r.unitStart && pos.offset <= r.unitStart + visibleLength(r);
  const candidates = runs.filter(contains);
  const run = candidates.find((r) => pos.offset < r.unitStart + visibleLength(r)) ?? candidates[candidates.length - 1];
  if (!run) return undefined;
  const local = Math.min(pos.offset - run.unitStart, visibleLength(run));
  const box = runBox(run);
  return { xPt: run.xPt + sum(run.advances, 0, local), yPt: box.yPt, widthPt: 0, heightPt: box.heightPt };
}

/** Boxes covering `range` on this page; a tracked deletion inside the range is covered whole. */
export function rectsForRange(runs: RunView[], range: UnitRange): Rect[] {
  const rects: Rect[] = [];
  for (const run of runs) {
    if (run.unit !== range.unit) continue;
    const box = runBox(run);
    let start: number;
    let end: number;
    if (visibleLength(run) === 0) {
      if (!(range.start <= run.unitStart && range.end > run.unitStart)) continue;
      [start, end] = [0, run.advances.length];
    } else {
      start = Math.max(range.start - run.unitStart, 0);
      end = Math.min(range.end - run.unitStart, run.advances.length);
      if (end <= start) continue;
    }
    rects.push({
      xPt: run.xPt + sum(run.advances, 0, start),
      yPt: box.yPt,
      widthPt: sum(run.advances, start, end),
      heightPt: box.heightPt,
    });
  }
  return rects;
}

/** True when two runs share a line (baselines differ by less than a raised/lowered script shift). */
export function sameLine(a: RunView, b: RunView): boolean {
  return Math.abs(a.yPt - b.yPt) < 0.4 * Math.max(a.fontSizePt, b.fontSizePt);
}

/** Indices of the runs of the same unit on the line of `runs[index]`. */
export function lineOf(runs: RunView[], index: number): number[] {
  const anchor = runs[index];
  if (!anchor) return [];
  return runs.flatMap((run, i) => (run.unit === anchor.unit && sameLine(run, anchor) ? [i] : []));
}

const WORD = /[\p{L}\p{N}_]/u;

/** Next word boundary from `offset` in `text` (Word-style: words swallow trailing spaces). */
export function wordBoundary(text: string, offset: number, direction: 1 | -1): number {
  const chars = Array.from(text);
  let i = Math.min(Math.max(offset, 0), chars.length);
  const isWord = (c: string | undefined) => c !== undefined && WORD.test(c);
  const isSpace = (c: string | undefined) => c !== undefined && /\s/u.test(c);
  if (direction > 0) {
    if (isWord(chars[i])) while (isWord(chars[i])) i++;
    else if (!isSpace(chars[i]) && i < chars.length) i++;
    while (isSpace(chars[i])) i++;
  } else {
    while (isSpace(chars[i - 1])) i--;
    if (isWord(chars[i - 1])) while (isWord(chars[i - 1])) i--;
    else if (i > 0) i--;
  }
  return i;
}

/** `[start, end)` of the word (or run of other characters) around `offset`. */
export function wordAt(text: string, offset: number): [number, number] {
  const chars = Array.from(text);
  const at = Math.min(offset, Math.max(chars.length - 1, 0));
  const kind = (c: string | undefined) => (c === undefined ? -1 : WORD.test(c) ? 0 : /\s/u.test(c) ? 1 : 2);
  const k = kind(chars[at]);
  let start = at;
  let end = at;
  while (start > 0 && kind(chars[start - 1]) === k) start--;
  while (end < chars.length && kind(chars[end]) === k) end++;
  return [start, end];
}
