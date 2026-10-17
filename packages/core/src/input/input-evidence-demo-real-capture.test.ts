import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDemoRealCaptureSlotManifest,
  projectPhysicalDemoCaptureToRealSlotFile,
  validatePhysicalDemoCaptureForRealSlot,
} from "./input-evidence-demo-real-capture.js";

const evidenceDir = join(import.meta.dirname, "../../../../evidence/gates/G3-feasibility");

describe("G3-INPUT-17 demo real log slot capture", () => {
  it("projects non-synthetic demo capture into IME-01 real slot shape", () => {
    const payload = {
      demoCaptureKind: "ime-demo-macos" as const,
      demoSessionId: "demo-sess",
      platform: "macos",
      capturedAt: "2026-10-17T10:00:00.000Z",
      entries: [
        { ts: "t0", eventType: "compositionstart", fields: {} },
        { ts: "t1", eventType: "compositionupdate", fields: { data: "a" } },
        { ts: "t2", eventType: "compositionend", fields: { data: "a" } },
        { ts: "t3", eventType: "input", fields: { inputType: "insertCompositionText" } },
      ],
    };
    const file = projectPhysicalDemoCaptureToRealSlotFile(payload);
    expect("ok" in file).toBe(false);
    if ("ok" in file) return;
    expect(file.slotId).toBe("IME-01-real");
    expect(file.synthetic).toBe(false);
    const verdict = validatePhysicalDemoCaptureForRealSlot(payload);
    expect(verdict.ok).toBe(true);
  });

  it("rejects synthetic entries in physical demo capture", () => {
    const verdict = validatePhysicalDemoCaptureForRealSlot({
      demoCaptureKind: "sr-demo-voiceover",
      demoSessionId: "demo-sess",
      platform: "voiceover",
      capturedAt: "2026-10-17T10:00:00.000Z",
      entries: [{ ts: "t0", eventType: "focus", synthetic: true, fields: {} }],
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.kind).toBe("synthetic-entry");
  });

  it("writes demo real capture slot manifest", () => {
    const manifest = buildDemoRealCaptureSlotManifest();
    expect(manifest.gateStatus).toBe("not-run");
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, "demo-real-capture-slots.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  });
});
