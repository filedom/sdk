import { describe, expect, it } from "vitest";
import { buildSyntheticGateGradeCaptureLog } from "./input-evidence-synthetic-gate-grade-generator.js";

describe("G3-INPUT-23 synthetic gate-grade log generator", () => {
  it("builds IME gate-grade-shaped log marked synthetic", () => {
    const log = buildSyntheticGateGradeCaptureLog("ime-gate-grade");
    expect(log.synthetic).toBe(true);
    expect(log.gateStatus).toBe("not-run");
    expect(log.entries.every((e) => e.synthetic === true)).toBe(true);
  });

  it("builds SR gate-grade-shaped log marked synthetic", () => {
    const log = buildSyntheticGateGradeCaptureLog("sr-gate-grade");
    expect(log.synthetic).toBe(true);
    expect(log.logKind).toBe("sr-gate-grade");
  });
});
