/** F06 virtual surfaces: visible-page priority and bounded cache keys. */

export function visiblePageWindow(
  currentIndex: number,
  pageCount: number,
  radius = 1,
): readonly number[] {
  const pages: number[] = [];
  for (let i = currentIndex - radius; i <= currentIndex + radius; i++) {
    if (i >= 0 && i < pageCount) pages.push(i);
  }
  return pages;
}

export function boundedPaintCacheKeys(
  visible: readonly number[],
  maxCached = 8,
): readonly string[] {
  return visible.slice(0, maxCached).map((pageIndex) => `page:${pageIndex}`);
}
