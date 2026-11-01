import type { SearchHit } from "./engine-types.js";

/**
 * Order search hits so a later match in the same unit is replaced first.
 * Offsets of earlier matches stay valid. An overlap with a match already
 * queued in that unit is dropped.
 */
export function replacementOrder(hits: readonly SearchHit[]): SearchHit[] {
  const byUnit = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const list = byUnit.get(hit.unit);
    if (list) list.push(hit);
    else byUnit.set(hit.unit, [hit]);
  }
  const ordered: SearchHit[] = [];
  for (const list of byUnit.values()) {
    list.sort((a, b) => b.start - a.start || b.end - a.end);
    let nextStart = Number.POSITIVE_INFINITY;
    for (const hit of list) {
      if (hit.end > nextStart) continue;
      ordered.push(hit);
      nextStart = hit.start;
    }
  }
  return ordered;
}
