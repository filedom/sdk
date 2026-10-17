import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRealInputLogSlotManifest,
  REAL_INPUT_LOG_SLOTS,
  validateRealPlatformInputLog,
} from "./input-evidence-real-log-slots.js";

const evidenceDir = join(import.meta.dirname, "../../../../evidence/gates/G3-feasibility");

describe("G3-INPUT-10 real IME/SR log slots", () => {
  it("defines empty real capture slots", () => {
    expect(REAL_INPUT_LOG_SLOTS.map((s) => s.slotId)).toEqual([
      "IME-01-real",
      "IME-02-real",
      "SR-01-real",
    ]);
    const manifest = buildRealInputLogSlotManifest();
    expect(manifest.gateStatus).toBe("not-run");
    expect(manifest.slots.every((s) => s.captureStatus === "empty")).toBe(true);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "ime-sr-real-log-slots.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  });

  it("rejects synthetic entries for real slot validation", () => {
    const slot = REAL_INPUT_LOG_SLOTS[0]!;
    const result = validateRealPlatformInputLog(
      slot,
      [
        {
          ts: "2026-01-01T00:00:00.000Z",
          eventType: "compositionstart",
          synthetic: true,
          fields: {},
        },
      ],
      { platform: "macos", capturedAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("synthetic-not-allowed");
  });
});
