import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSyntheticGateGradeCaptureLog,
  validateSyntheticGateGradeIngestPayload,
} from "./input-evidence-synthetic-gate-grade-generator.js";

const webRoot = join(import.meta.dirname, "../../../..");
const g3LogsDir = join(webRoot, "evidence/gates/G3-feasibility/logs");

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

  it.each([
    "gate-grade-ime_gate_grade-synthetic-ci.json",
    "gate-grade-sr_gate_grade-synthetic-ci.json",
  ] as const)("ingests CI synthetic gate-grade log %s", (fileName) => {
    const raw = JSON.parse(readFileSync(join(g3LogsDir, fileName), "utf8"));
    const verdict = validateSyntheticGateGradeIngestPayload(raw);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.payload.synthetic).toBe(true);
      expect(verdict.payload.gateStatus).toBe("not-run");
    }
  });
});
