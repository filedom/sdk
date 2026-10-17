/** G3-INPUT-17: project physical demo IME/SR captures into real log slot file shape. */

import type { CapturedInputLogEntry } from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";
import {
  REAL_PLATFORM_LOG_RELATIVE_PATHS,
  REAL_INPUT_LOG_SLOTS,
  validateRealPlatformInputLog,
  type RealInputLogSlot,
} from "./input-evidence-real-log-slots.js";
import type { PlatformInputLogFile } from "./input-platform-log-ingestion.js";

/** Demo shell export targets (non-synthetic files written after physical capture). */
export const DEMO_PHYSICAL_CAPTURE_LOG_PATHS = {
  "ime-demo-macos": "evidence/gates/G3-feasibility/logs/ime-demo-macos-real-capture-pending.json",
  "ime-demo-windows": "evidence/gates/G3-feasibility/logs/ime-demo-windows-real-capture-pending.json",
  "sr-demo-voiceover": "evidence/gates/G3-feasibility/logs/sr-demo-voiceover-real-capture-pending.json",
} as const;

export type DemoPhysicalCaptureKind = keyof typeof DEMO_PHYSICAL_CAPTURE_LOG_PATHS;

const DEMO_KIND_TO_SLOT: Record<DemoPhysicalCaptureKind, RealInputLogSlot["slotId"]> = {
  "ime-demo-macos": "IME-01-real",
  "ime-demo-windows": "IME-02-real",
  "sr-demo-voiceover": "SR-01-real",
};

export type DemoRealCaptureIssue =
  | { ok: false; kind: "synthetic-entry"; index: number }
  | { ok: false; kind: "unknown-demo-kind"; detail: string }
  | { ok: false; kind: "slot-validation"; detail: string }
  | { ok: true; slotId: RealInputLogSlot["slotId"]; targetLogPath: string; entryCount: number };

export interface PhysicalDemoCapturePayload {
  demoCaptureKind: DemoPhysicalCaptureKind;
  demoSessionId: string;
  platform: string;
  capturedAt: string;
  entries: readonly CapturedInputLogEntry[];
}

/** Map demo shell export into on-disk real slot JSON (rejects synthetic entries). */
export function projectPhysicalDemoCaptureToRealSlotFile(
  payload: PhysicalDemoCapturePayload,
): PlatformInputLogFile | { ok: false; detail: string } {
  const slotId = DEMO_KIND_TO_SLOT[payload.demoCaptureKind];
  if (!slotId) {
    return { ok: false, detail: `unknown-demo-kind:${payload.demoCaptureKind}` };
  }
  for (let i = 0; i < payload.entries.length; i++) {
    if (payload.entries[i]?.synthetic === true) {
      return { ok: false, detail: `synthetic-entry-at-${i}` };
    }
  }
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    slotId,
    platform: payload.platform,
    capturedAt: payload.capturedAt,
    synthetic: false,
    entries: payload.entries.map((e) => ({ ...e, synthetic: false as const })),
  };
}

export function validatePhysicalDemoCaptureForRealSlot(
  payload: PhysicalDemoCapturePayload,
): DemoRealCaptureIssue {
  const slotId = DEMO_KIND_TO_SLOT[payload.demoCaptureKind];
  if (!slotId) {
    return { ok: false, kind: "unknown-demo-kind", detail: payload.demoCaptureKind };
  }
  for (let i = 0; i < payload.entries.length; i++) {
    if (payload.entries[i]?.synthetic === true) {
      return { ok: false, kind: "synthetic-entry", index: i };
    }
  }
  const slot = REAL_INPUT_LOG_SLOTS.find((s) => s.slotId === slotId)!;
  const validation = validateRealPlatformInputLog(slot, payload.entries, {
    platform: payload.platform,
    capturedAt: payload.capturedAt,
  });
  if (!validation.ok) {
    return {
      ok: false,
      kind: "slot-validation",
      detail: "detail" in validation ? validation.detail : validation.kind,
    };
  }
  const targetLogPath =
    payload.demoCaptureKind === "ime-demo-macos"
      ? REAL_PLATFORM_LOG_RELATIVE_PATHS["IME-01-real"]
      : payload.demoCaptureKind === "ime-demo-windows"
        ? REAL_PLATFORM_LOG_RELATIVE_PATHS["IME-02-real"]
        : REAL_PLATFORM_LOG_RELATIVE_PATHS["SR-01-real"];
  return {
    ok: true,
    slotId,
    targetLogPath,
    entryCount: payload.entries.length,
  };
}

export function buildDemoRealCaptureSlotManifest(): {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  gateStatus: "not-run";
  demoCapturePaths: typeof DEMO_PHYSICAL_CAPTURE_LOG_PATHS;
  note: string;
} {
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    recordedAt: new Date().toISOString(),
    gateStatus: "not-run",
    demoCapturePaths: DEMO_PHYSICAL_CAPTURE_LOG_PATHS,
    note: "G3-INPUT-17 demo → real slot projection; physical-host capture still not-run; gate not-run",
  };
}
