/** G3-INPUT-16: fuller synthetic demo IME/SR session payloads — must stay labeled synthetic. */

import type { CapturedInputLogEntry } from "./input-evidence-log-templates.js";
import {
  IME_LOG_CAPTURE_TEMPLATES,
  SR_LOG_CAPTURE_TEMPLATES,
  validateCapturedImeLog,
  validateCapturedSrLog,
} from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";

export const SYNTHETIC_DEMO_SESSION_FORMAT_VERSION = 1 as const;

export interface SyntheticDemoInputSessionFile {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  sessionKind: "synthetic-demo-ime" | "synthetic-demo-sr";
  synthetic: true;
  platform: string;
  capturedAt: string;
  demoSessionId: string;
  hostLabel: string;
  entries: readonly CapturedInputLogEntry[];
}

export type SyntheticDemoSessionValidationIssue =
  | { ok: false; kind: "missing-field"; field: string }
  | { ok: false; kind: "synthetic-flag-required"; detail: string }
  | { ok: false; kind: "entry-not-synthetic"; index: number }
  | { ok: false; kind: "template-mismatch"; detail: string }
  | { ok: true; sessionKind: SyntheticDemoInputSessionFile["sessionKind"]; eventCount: number };

export function validateSyntheticDemoInputSessionFile(
  file: SyntheticDemoInputSessionFile,
): SyntheticDemoSessionValidationIssue {
  if (file.synthetic !== true) {
    return { ok: false, kind: "synthetic-flag-required", detail: "session file must set synthetic: true" };
  }
  if (!file.demoSessionId?.trim()) {
    return { ok: false, kind: "missing-field", field: "demoSessionId" };
  }
  if (!file.hostLabel?.trim()) {
    return { ok: false, kind: "missing-field", field: "hostLabel" };
  }
  if (!file.platform?.trim()) {
    return { ok: false, kind: "missing-field", field: "platform" };
  }
  if (!file.capturedAt?.trim()) {
    return { ok: false, kind: "missing-field", field: "capturedAt" };
  }
  for (let i = 0; i < file.entries.length; i++) {
    if (file.entries[i]?.synthetic !== true) {
      return { ok: false, kind: "entry-not-synthetic", index: i };
    }
  }
  if (file.sessionKind === "synthetic-demo-sr") {
    const template = SR_LOG_CAPTURE_TEMPLATES[0]!;
    const verdict = validateCapturedSrLog(template, file.entries);
    if (!verdict.ok) {
      return {
        ok: false,
        kind: "template-mismatch",
        detail: "detail" in verdict ? verdict.detail : verdict.eventType,
      };
    }
    return { ok: true, sessionKind: file.sessionKind, eventCount: file.entries.length };
  }
  const template = IME_LOG_CAPTURE_TEMPLATES.find((t) => t.platform === file.platform);
  if (!template) {
    return { ok: false, kind: "template-mismatch", detail: `no IME template for platform ${file.platform}` };
  }
  const verdict = validateCapturedImeLog(template, file.entries);
  if (!verdict.ok) {
    return {
      ok: false,
      kind: "template-mismatch",
      detail: "detail" in verdict ? verdict.detail : verdict.eventType,
    };
  }
  return { ok: true, sessionKind: file.sessionKind, eventCount: file.entries.length };
}
