/** G3-INPUT-09: platform IME/SR log capture templates + synthetic log validation. */

import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";

export const INPUT_LOG_CAPTURE_TEMPLATE_VERSION = 1 as const;

export interface ImeLogCaptureTemplate {
  templateId: "IME-01" | "IME-02";
  platform: "macos" | "windows" | "linux" | "manual";
  requiredEventTypes: readonly string[];
  sampleFields: readonly string[];
}

export interface SrLogCaptureTemplate {
  templateId: "SR-01";
  assistiveTech: "voiceover" | "nvda" | "manual";
  requiredEventTypes: readonly string[];
  sampleFields: readonly string[];
}

export const IME_LOG_CAPTURE_TEMPLATES: readonly ImeLogCaptureTemplate[] = [
  {
    templateId: "IME-01",
    platform: "macos",
    requiredEventTypes: ["compositionstart", "compositionupdate", "compositionend"],
    sampleFields: ["data-composition-state", "data-composition-preedit", "caretOffset"],
  },
  {
    templateId: "IME-02",
    platform: "windows",
    requiredEventTypes: ["compositionstart", "compositionupdate", "compositionend", "input"],
    sampleFields: ["data-composition-state", "data-caret-offset", "committedText"],
  },
];

export const SR_LOG_CAPTURE_TEMPLATES: readonly SrLogCaptureTemplate[] = [
  {
    templateId: "SR-01",
    assistiveTech: "voiceover",
    requiredEventTypes: ["focusin", "aria-live", "selectionchange"],
    sampleFields: ["role", "name", "value", "caretDescription"],
  },
];

export interface CapturedInputLogEntry {
  ts: string;
  eventType: string;
  synthetic?: boolean;
  fields: Record<string, string | number | boolean | null>;
}

export type InputLogValidationIssue =
  | { ok: false; kind: "template-version"; detail: string }
  | { ok: false; kind: "missing-event"; eventType: string }
  | { ok: false; kind: "empty-log"; detail: string }
  | { ok: true; synthetic: boolean; eventCount: number };

export function validateCapturedImeLog(
  template: ImeLogCaptureTemplate,
  entries: readonly CapturedInputLogEntry[],
): InputLogValidationIssue {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, kind: "empty-log", detail: "entries[] required" };
  }
  const synthetic = entries.every((e) => e.synthetic === true);
  for (const required of template.requiredEventTypes) {
    if (!entries.some((e) => e.eventType === required)) {
      return { ok: false, kind: "missing-event", eventType: required };
    }
  }
  return { ok: true, synthetic, eventCount: entries.length };
}

export function validateCapturedSrLog(
  template: SrLogCaptureTemplate,
  entries: readonly CapturedInputLogEntry[],
): InputLogValidationIssue {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, kind: "empty-log", detail: "entries[] required" };
  }
  const synthetic = entries.every((e) => e.synthetic === true);
  for (const required of template.requiredEventTypes) {
    if (!entries.some((e) => e.eventType === required)) {
      return { ok: false, kind: "missing-event", eventType: required };
    }
  }
  return { ok: true, synthetic, eventCount: entries.length };
}

export function buildImeEvidenceFileFromSyntheticLog(
  template: ImeLogCaptureTemplate,
  entries: readonly CapturedInputLogEntry[],
): {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  status: "partial";
  fixtures: readonly {
    fixtureId: ImeLogCaptureTemplate["templateId"];
    platform: string;
    description: string;
    expectedDatasets: readonly string[];
    logPath: null;
    result: "not-run";
    syntheticLogEntryCount: number;
  }[];
  note: string;
} {
  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    recordedAt: new Date().toISOString(),
    status: "partial",
    fixtures: [
      {
        fixtureId: template.templateId,
        platform: template.platform,
        description: "Synthetic log capture template validation (G3-INPUT-09)",
        expectedDatasets: [...template.sampleFields],
        logPath: null,
        result: "not-run",
        syntheticLogEntryCount: entries.length,
      },
    ],
    note: "Synthetic logs labeled; real platform capture still not-run for gate G3.",
  };
}
