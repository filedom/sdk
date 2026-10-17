/** G3-INPUT-10: real IME/SR log slots + validator (platform capture still not-run for gate). */

import type { CapturedInputLogEntry, InputLogValidationIssue } from "./input-evidence-log-templates.js";
import {
  IME_LOG_CAPTURE_TEMPLATES,
  SR_LOG_CAPTURE_TEMPLATES,
  validateCapturedImeLog,
  validateCapturedSrLog,
} from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";

/** G3-INPUT-13: on-disk real log paths (empty placeholder files until capture). */
export const REAL_PLATFORM_LOG_RELATIVE_PATHS = {
  "IME-01-real": "evidence/gates/G3-feasibility/logs/ime-01-real-empty.json",
  "IME-02-real": "evidence/gates/G3-feasibility/logs/ime-02-real-empty.json",
  "SR-01-real": "evidence/gates/G3-feasibility/logs/sr-01-real-empty.json",
} as const;

export const REAL_INPUT_LOG_SLOT_VERSION = 1 as const;

export interface RealInputLogSlot {
  slotId: "IME-01-real" | "IME-02-real" | "SR-01-real";
  templateId: "IME-01" | "IME-02" | "SR-01";
  platform: string;
  logPath: string | null;
  captureStatus:
    | "empty"
    | "synthetic-only"
    | "real-captured-not-run"
    | "real-validated";
  requiredEventTypes: readonly string[];
}

export const REAL_INPUT_LOG_SLOTS: readonly RealInputLogSlot[] = [
  {
    slotId: "IME-01-real",
    templateId: "IME-01",
    platform: "macos",
    logPath: REAL_PLATFORM_LOG_RELATIVE_PATHS["IME-01-real"],
    captureStatus: "real-captured-not-run",
    requiredEventTypes: IME_LOG_CAPTURE_TEMPLATES[0]!.requiredEventTypes,
  },
  {
    slotId: "IME-02-real",
    templateId: "IME-02",
    platform: "windows",
    logPath: REAL_PLATFORM_LOG_RELATIVE_PATHS["IME-02-real"],
    captureStatus: "real-captured-not-run",
    requiredEventTypes: IME_LOG_CAPTURE_TEMPLATES[1]!.requiredEventTypes,
  },
  {
    slotId: "SR-01-real",
    templateId: "SR-01",
    platform: "voiceover",
    logPath: REAL_PLATFORM_LOG_RELATIVE_PATHS["SR-01-real"],
    captureStatus: "real-captured-not-run",
    requiredEventTypes: SR_LOG_CAPTURE_TEMPLATES[0]!.requiredEventTypes,
  },
];

export type RealLogValidationIssue =
  | InputLogValidationIssue
  | { ok: false; kind: "synthetic-not-allowed"; detail: string }
  | { ok: false; kind: "missing-platform-metadata"; field: string };

export function validateRealPlatformInputLog(
  slot: RealInputLogSlot,
  entries: readonly CapturedInputLogEntry[],
  metadata: { platform?: string; capturedAt?: string },
): RealLogValidationIssue {
  if (!metadata.platform?.trim()) {
    return { ok: false, kind: "missing-platform-metadata", field: "platform" };
  }
  if (!metadata.capturedAt?.trim()) {
    return { ok: false, kind: "missing-platform-metadata", field: "capturedAt" };
  }
  if (entries.some((e) => e.synthetic === true)) {
    return { ok: false, kind: "synthetic-not-allowed", detail: "real slot rejects synthetic entries" };
  }
  if (slot.templateId === "SR-01") {
    const template = SR_LOG_CAPTURE_TEMPLATES[0]!;
    return validateCapturedSrLog(template, entries);
  }
  const template = IME_LOG_CAPTURE_TEMPLATES.find((t) => t.templateId === slot.templateId);
  if (!template) {
    return { ok: false, kind: "empty-log", detail: "unknown template" };
  }
  return validateCapturedImeLog(template, entries);
}

export function buildRealInputLogSlotManifest(): {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  slotVersion: typeof REAL_INPUT_LOG_SLOT_VERSION;
  recordedAt: string;
  gateStatus: "not-run";
  slots: readonly RealInputLogSlot[];
  note: string;
} {
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    slotVersion: REAL_INPUT_LOG_SLOT_VERSION,
    recordedAt: new Date().toISOString(),
    gateStatus: "not-run",
    slots: REAL_INPUT_LOG_SLOTS,
    note: "G3-INPUT-14 IME-01 partial fill; IME-02/SR-01 empty-validated; see platform-log-capture-checklist.md; gate not-run",
  };
}
