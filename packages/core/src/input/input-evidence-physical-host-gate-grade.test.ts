import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPhysicalHostCaptureExecutionPlan,
  buildPhysicalHostGateGradeCaptureLog,
  buildPhysicalHostGateGradeManifest,
  validatePhysicalHostGateGradeEntries,
  validatePhysicalHostGateGradeIngestPayload,
} from "./input-evidence-physical-host-gate-grade.js";

const evidenceDir = join(import.meta.dirname, "../../../../evidence/gates/G3-feasibility");

describe("G3-INPUT-19 physical host gate-grade logs", () => {
  it("requires IME composition chain for gate-grade IME logs", () => {
    const verdict = validatePhysicalHostGateGradeEntries("ime-gate-grade", [
      { ts: "t0", eventType: "compositionstart", fields: {} },
      { ts: "t1", eventType: "compositionend", fields: {} },
    ]);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.detail).toContain("compositionupdate");
  });

  it("builds gate-grade capture log from validated physical demo payload", () => {
    const log = buildPhysicalHostGateGradeCaptureLog(
      {
        demoCaptureKind: "ime-demo-macos",
        demoSessionId: "host-cap-01",
        platform: "macos",
        capturedAt: "2026-10-17T14:00:00.000Z",
        entries: [
          { ts: "t0", eventType: "compositionstart", fields: {} },
          { ts: "t1", eventType: "compositionupdate", fields: { data: "a" } },
          { ts: "t2", eventType: "compositionend", fields: { data: "a" } },
        ],
      },
      {
        hostOs: "darwin",
        hostArch: "arm64",
        browserChannel: "chromium",
        logKind: "ime-gate-grade",
      },
    );
    expect("ok" in log).toBe(false);
    if ("ok" in log) return;
    expect(log.gateStatus).toBe("not-run");
    expect(log.card).toBe("G3-INPUT-19");
    expect(log.validated).toBe(true);
  });

  it("writes gate-grade manifest artifact", () => {
    const manifest = buildPhysicalHostGateGradeManifest();
    expect(manifest.gateStatus).toBe("not-run");
    expect(manifest.note).toContain("G3-INPUT-20");
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "physical-host-gate-grade-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  });

  it("G3-INPUT-21 rejects synthetic ingest payloads", () => {
    const verdict = validatePhysicalHostGateGradeIngestPayload({
      synthetic: true,
      validated: true,
      slotId: "IME-01-real",
      logKind: "ime-gate-grade",
      entries: [],
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.detail).toBe("synthetic-forbidden");
  });

  it("G3-INPUT-20 marks linux-ci as non-executable for physical capture", () => {
    const plan = buildPhysicalHostCaptureExecutionPlan("linux");
    expect(plan.card).toBe("G3-INPUT-20");
    expect(plan.canExecuteCaptureOnThisHost).toBe(false);
    expect(plan.host).toBe("linux-ci");
  });
});
