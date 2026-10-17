import { describe, expect, it } from "vitest";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";
import { ingestRealPlatformInputLog } from "./input-platform-log-ingestion.js";

describe("G3-INPUT-12 platform log ingestion path", () => {
  it("accepts empty real slot with valid shape", () => {
    const payload = JSON.stringify({
      formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
      slotId: "IME-01-real",
      platform: "macos",
      capturedAt: new Date(0).toISOString(),
      synthetic: false,
      entries: [],
    });
    const outcome = ingestRealPlatformInputLog(payload);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.entryCount).toBe(0);
      expect(outcome.validated).toBe(false);
    }
  });

  it("rejects synthetic flagged files for real ingestion", () => {
    const payload = JSON.stringify({
      formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
      slotId: "SR-01-real",
      platform: "voiceover",
      capturedAt: new Date(0).toISOString(),
      synthetic: true,
      entries: [],
    });
    expect(ingestRealPlatformInputLog(payload)).toEqual({
      ok: false,
      detail: "real-ingestion-rejects-synthetic-file-flag",
    });
  });
});
