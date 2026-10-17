/**
 * Marks OPC parts that must round-trip as opaque byte blobs (D03 preservation bag).
 * Parsed parts (e.g. document.xml) are excluded from the bag by the store.
 */

export class PreservationBag {
  private readonly sealed = new Set<string>();

  seal(path: string): void {
    this.sealed.add(normalize(path));
  }

  sealAll(paths: Iterable<string>): void {
    for (const path of paths) {
      this.seal(path);
    }
  }

  isSealed(path: string): boolean {
    return this.sealed.has(normalize(path));
  }

  sealedPaths(): string[] {
    return [...this.sealed].sort();
  }
}

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}
