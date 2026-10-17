/** G3-INPUT-23: synthetic gate-grade-shaped logs for CI — must stay synthetic (not G3 pass). */

import type { CapturedInputLogEntry } from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";
import type { PhysicalHostGateGradeLogKind } from "./input-evidence-physical-host-gate-grade.js";

const MIN_GATE_GRADE_IME_EVENTS = ["compositionstart", "compositionupdate", "compositionend"] as const;
const MIN_GATE_GRADE_SR_EVENTS = ["focus", "aria"] as const;

function validateSyntheticGateGradeEventShape(
  logKind: PhysicalHostGateGradeLogKind,
  entries: readonly CapturedInputLogEntry[],
): { ok: true } | { ok: false; detail: string } {
  const types = new Set(entries.map((e) => e.eventType));
  const required = logKind === "ime-gate-grade" ? MIN_GATE_GRADE_IME_EVENTS : MIN_GATE_GRADE_SR_EVENTS;
  for (const eventType of required) {
    if (!types.has(eventType)) {
      return { ok: false, detail: `missing-event:${eventType}` };
    }
  }
  return { ok: true };
}

export interface SyntheticGateGradeCaptureLog {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  gateStatus: "not-run";
  card: "G3-INPUT-23";
  logKind: PhysicalHostGateGradeLogKind;
  slotId: "synthetic-ci-gate-grade";
  hostOs: "synthetic";
  hostArch: "synthetic";
  browserChannel: "playwright-ci";
  captureSessionId: string;
  synthetic: true;
  validated: true;
  entries: readonly CapturedInputLogEntry[];
  note: string;
}

export function buildSyntheticGateGradeCaptureLog(
  logKind: PhysicalHostGateGradeLogKind,
  captureSessionId = "synthetic-gate-grade-ci",
): SyntheticGateGradeCaptureLog {
  const entries: CapturedInputLogEntry[] =
    logKind === "ime-gate-grade"
      ? [
          { ts: "t0", eventType: "compositionstart", synthetic: true, fields: { data: "" } },
          { ts: "t1", eventType: "compositionupdate", synthetic: true, fields: { data: "あ" } },
          { ts: "t2", eventType: "compositionend", synthetic: true, fields: { data: "あ" } },
        ]
      : [
          { ts: "t0", eventType: "focus", synthetic: true, fields: { targetRole: "textbox" } },
          { ts: "t1", eventType: "aria", synthetic: true, fields: { label: "composition probe" } },
        ];

  const verdict = validateSyntheticGateGradeEventShape(logKind, entries);
  if (!verdict.ok) {
    throw new Error(`synthetic gate-grade template invalid: ${verdict.detail}`);
  }

  return {
    formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
    recordedAt: new Date().toISOString(),
    gateStatus: "not-run",
    card: "G3-INPUT-23",
    logKind,
    slotId: "synthetic-ci-gate-grade",
    hostOs: "synthetic",
    hostArch: "synthetic",
    browserChannel: "playwright-ci",
    captureSessionId,
    synthetic: true,
    validated: true,
    entries,
    note: "Synthetic gate-grade log shape for CI only; G3 gate remains not-run until physical host capture (synthetic: false).",
  };
}
