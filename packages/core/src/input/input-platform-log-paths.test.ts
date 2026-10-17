import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_INPUT_LOG_SLOTS } from "./input-evidence-real-log-slots.js";
import {
  REAL_PLATFORM_LOG_RELATIVE_PATHS,
  validateRealPlatformLogPaths,
} from "./input-platform-log-paths.js";

const webRoot = join(import.meta.dirname, "../../../..");

describe("G3-INPUT-15 real platform log paths", () => {
  it("binds each real slot to an evidence log path", () => {
    for (const slot of REAL_INPUT_LOG_SLOTS) {
      expect(slot.logPath).toBe(REAL_PLATFORM_LOG_RELATIVE_PATHS[slot.slotId]);
      expect(slot.captureStatus).toBe("real-captured-not-run");
    }
  });

  it("validates partial fill + empty on-disk logs vs missing files", () => {
    const results = validateRealPlatformLogPaths((relativePath) => {
      const abs = join(webRoot, relativePath);
      if (!existsSync(abs)) return null;
      return readFileSync(abs, "utf8");
    });
    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.status === "empty-validated").length).toBe(0);
    const filled = results.filter((r) => r.status === "filled-validated");
    expect(filled).toHaveLength(3);
    expect(filled.map((f) => f.slotId).sort()).toEqual(["IME-01-real", "IME-02-real", "SR-01-real"]);
  });
});
