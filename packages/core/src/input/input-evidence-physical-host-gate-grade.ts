/** G3-INPUT-19/20: gate-grade physical-host IME/SR capture log shape (host capture still not-run). */

import type { CapturedInputLogEntry } from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";
import {
  buildValidatedPhysicalDemoCaptureFile,
  type PhysicalDemoCapturePayload,
} from "./input-evidence-demo-real-capture.js";
import {
  REAL_INPUT_LOG_SLOTS,
  REAL_PLATFORM_LOG_RELATIVE_PATHS,
  validateRealPlatformInputLog,
  type RealInputLogSlot,
} from "./input-evidence-real-log-slots.js";

export type PhysicalHostGateGradeLogKind = "ime-gate-grade" | "sr-gate-grade";

export interface PhysicalHostGateGradeCaptureLog {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  gateStatus: "not-run";
  card: "G3-INPUT-19";
  logKind: PhysicalHostGateGradeLogKind;
  slotId: RealInputLogSlot["slotId"];
  hostOs: string;
  hostArch: string;
  browserChannel: string;
  captureSessionId: string;
  synthetic: false;
  validated: true;
  entries: readonly CapturedInputLogEntry[];
  note: string;
}

export interface PhysicalHostGateGradeManifest {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  gateStatus: "not-run";
  requiredHostActions: readonly string[];
  slotPaths: typeof REAL_PLATFORM_LOG_RELATIVE_PATHS;
  note: string;
}

const MIN_GATE_GRADE_IME_EVENTS = ["compositionstart", "compositionupdate", "compositionend"] as const;
const MIN_GATE_GRADE_SR_EVENTS = ["focus", "aria"] as const;

export function validatePhysicalHostGateGradeEntries(
  logKind: PhysicalHostGateGradeLogKind,
  entries: readonly CapturedInputLogEntry[],
): { ok: true } | { ok: false; detail: string } {
  if (entries.some((e) => e.synthetic === true)) {
    return { ok: false, detail: "synthetic-entry-forbidden" };
  }
  const types = new Set(entries.map((e) => e.eventType));
  const required =
    logKind === "ime-gate-grade" ? MIN_GATE_GRADE_IME_EVENTS : MIN_GATE_GRADE_SR_EVENTS;
  for (const eventType of required) {
    if (!types.has(eventType)) {
      return { ok: false, detail: `missing-event:${eventType}` };
    }
  }
  return { ok: true };
}

/** Build gate-grade log file from a validated physical demo payload + host metadata. */
export function buildPhysicalHostGateGradeCaptureLog(
  payload: PhysicalDemoCapturePayload,
  host: {
    hostOs: string;
    hostArch: string;
    browserChannel: string;
    logKind: PhysicalHostGateGradeLogKind;
  },
): PhysicalHostGateGradeCaptureLog | { ok: false; detail: string } {
  const validated = buildValidatedPhysicalDemoCaptureFile(payload);
  if ("ok" in validated) {
    return validated;
  }
  const entryCheck = validatePhysicalHostGateGradeEntries(host.logKind, payload.entries);
  if (!entryCheck.ok) {
    return entryCheck;
  }
  const slot = REAL_INPUT_LOG_SLOTS.find((s) => s.slotId === validated.slotId);
  if (!slot) {
    return { ok: false, detail: `unknown-slot:${validated.slotId}` };
  }
  const slotValidation = validateRealPlatformInputLog(slot, payload.entries, {
    platform: payload.platform,
    capturedAt: payload.capturedAt,
  });
  if (!slotValidation.ok) {
    return {
      ok: false,
      detail: "detail" in slotValidation ? slotValidation.detail : slotValidation.kind,
    };
  }
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    recordedAt: new Date().toISOString(),
    gateStatus: "not-run",
    card: "G3-INPUT-19",
    logKind: host.logKind,
    slotId: validated.slotId,
    hostOs: host.hostOs,
    hostArch: host.hostArch,
    browserChannel: host.browserChannel,
    captureSessionId: payload.demoSessionId,
    synthetic: false,
    validated: true,
    entries: validated.entries,
    note: "G3-INPUT-19 gate-grade physical-host log template; G3 gate remains not-run until real OS capture",
  };
}

export function buildPhysicalHostGateGradeManifest(): PhysicalHostGateGradeManifest {
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    recordedAt: new Date().toISOString(),
    gateStatus: "not-run",
    requiredHostActions: [
      "Run demo on physical macOS/Windows with real IME; export capture JSON (no synthetic:true)",
      "Run VoiceOver/NVDA session; export SR-01-real slot with focus+aria events",
      "Set hostOs/hostArch/browserChannel on gate-grade log before coordinator ingest",
    ],
    slotPaths: REAL_PLATFORM_LOG_RELATIVE_PATHS,
    note: "G3-INPUT-20 gate-grade logs; physical host capture not-run",
  };
}

export type PhysicalHostCaptureExecutionHost = "macos" | "windows" | "linux-ci" | "unknown";

export interface PhysicalHostCaptureExecutionPlan {
  card: "G3-INPUT-20";
  gateStatus: "not-run";
  host: PhysicalHostCaptureExecutionHost;
  canExecuteCaptureOnThisHost: boolean;
  captureScript: "pnpm run:physical-host-gate-grade-capture";
  ingestScript: "pnpm ingest:physical-host-gate-grade-log";
  note: string;
}

/** G3-INPUT-20: honest execution plan — Linux CI cannot run physical IME/SR capture. */
export function buildPhysicalHostCaptureExecutionPlan(
  platform: NodeJS.Platform = process.platform,
): PhysicalHostCaptureExecutionPlan {
  const host: PhysicalHostCaptureExecutionHost =
    platform === "darwin"
      ? "macos"
      : platform === "win32"
        ? "windows"
        : platform === "linux"
          ? "linux-ci"
          : "unknown";
  const canExecuteCaptureOnThisHost = host === "macos" || host === "windows";
  return {
    card: "G3-INPUT-20",
    gateStatus: "not-run",
    host,
    canExecuteCaptureOnThisHost,
    captureScript: "pnpm run:physical-host-gate-grade-capture",
    ingestScript: "pnpm ingest:physical-host-gate-grade-log",
    note: canExecuteCaptureOnThisHost
      ? "G3-INPUT-20 run capture on this physical host, then ingest gate-grade JSON; G3 gate not-run until coordinator review."
      : "G3-INPUT-20 cannot execute physical IME/SR capture on this host (CI/Linux); use macOS/Windows per manifest.",
  };
}
