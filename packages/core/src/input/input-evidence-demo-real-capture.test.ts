import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDemoRealCaptureSlotManifest,
  buildValidatedPhysicalDemoCaptureFile,
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

describe("G3-INPUT-18 physical demo real slot writes", () => {
  const macosPayload = {
    demoCaptureKind: "ime-demo-macos" as const,
    demoSessionId: "phys-demo-macos",
    platform: "macos",
    capturedAt: "2026-10-17T12:00:00.000Z",
    entries: [
      { ts: "t0", eventType: "compositionstart", fields: {} },
      { ts: "t1", eventType: "compositionupdate", fields: { data: "a" } },
      { ts: "t2", eventType: "compositionend", fields: { data: "a" } },
    ],
  };

  const windowsPayload = {
    demoCaptureKind: "ime-demo-windows" as const,
    demoSessionId: "phys-demo-win",
    platform: "windows",
    capturedAt: "2026-10-17T12:01:00.000Z",
    entries: [
      { ts: "t0", eventType: "compositionstart", fields: {} },
      { ts: "t1", eventType: "compositionupdate", fields: {} },
      { ts: "t2", eventType: "compositionend", fields: {} },
      { ts: "t3", eventType: "input", fields: { inputType: "insertCompositionText" } },
    ],
  };

  const srPayload = {
    demoCaptureKind: "sr-demo-voiceover" as const,
    demoSessionId: "phys-demo-sr",
    platform: "voiceover",
    capturedAt: "2026-10-17T12:02:00.000Z",
    entries: [
      { ts: "t0", eventType: "focusin", fields: { role: "textbox" } },
      { ts: "t1", eventType: "aria-live", fields: { value: "Hello" } },
      { ts: "t2", eventType: "selectionchange", fields: { caretDescription: "at end" } },
    ],
  };

  it("writes validated captures into real slot paths", () => {
    mkdirSync(join(evidenceDir, "logs"), { recursive: true });
    for (const payload of [macosPayload, windowsPayload, srPayload]) {
      const file = buildValidatedPhysicalDemoCaptureFile(payload);
      expect("ok" in file).toBe(false);
      if ("ok" in file) continue;
      expect(file.validated).toBe(true);
      expect(file.physicalCaptureCard).toBe("G3-INPUT-18");
      const verdict = validatePhysicalDemoCaptureForRealSlot(payload);
      expect(verdict.ok).toBe(true);
      if (!verdict.ok) continue;
      writeFileSync(
        join(evidenceDir, verdict.targetLogPath.replace(/^evidence\/gates\/G3-feasibility\//, "")),
        `${JSON.stringify(file, null, 2)}\n`,
      );
    }
  });
});
