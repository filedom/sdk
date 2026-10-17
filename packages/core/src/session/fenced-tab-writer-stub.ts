/** §13.2 / F42: fenced multi-tab writer — only one tab commits persist (stub, no BroadcastChannel). */

export type FencedTabWriterRejectReason = "other-tab-active" | "stale-fence-generation";

export interface FencedTabWriterAcquireOk {
  ok: true;
  tabId: string;
  fenceGeneration: number;
}

export interface FencedTabWriterAcquireRejected {
  ok: false;
  reason: FencedTabWriterRejectReason;
  activeTabId?: string;
}

export type FencedTabWriterAcquireResult = FencedTabWriterAcquireOk | FencedTabWriterAcquireRejected;

/** In-memory fence for a single document id (host adapter maps tabId → browser tab). */
export class FencedTabWriterOwnershipStub {
  private activeTabId: string | null = null;
  private fenceGeneration = 0;

  constructor(readonly documentId: string) {}

  tryAcquire(tabId: string): FencedTabWriterAcquireResult {
    if (this.activeTabId !== null && this.activeTabId !== tabId) {
      return { ok: false, reason: "other-tab-active", activeTabId: this.activeTabId };
    }
    this.activeTabId = tabId;
    this.fenceGeneration += 1;
    return { ok: true, tabId, fenceGeneration: this.fenceGeneration };
  }

  /** Release only when tab id and generation match the active lease. */
  release(tabId: string, fenceGeneration: number): boolean {
    if (this.activeTabId !== tabId || fenceGeneration !== this.fenceGeneration) {
      return false;
    }
    this.activeTabId = null;
    return true;
  }

  /** Persist commit must verify fence before manifest transaction (§13.2). */
  assertWriterFence(tabId: string, fenceGeneration: number): FencedTabWriterAcquireRejected | { ok: true } {
    if (this.activeTabId !== tabId) {
      return {
        ok: false,
        reason: "other-tab-active",
        activeTabId: this.activeTabId ?? undefined,
      };
    }
    if (fenceGeneration !== this.fenceGeneration) {
      return { ok: false, reason: "stale-fence-generation" };
    }
    return { ok: true };
  }
}
