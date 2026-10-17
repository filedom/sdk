/** G3-INPUT-12: validate and ingest real platform log files (format path; empty slots OK). */

import type { CapturedInputLogEntry } from "./input-evidence-log-templates.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";
import {
  REAL_INPUT_LOG_SLOTS,
  validateRealPlatformInputLog,
  type RealInputLogSlot,
} from "./input-evidence-real-log-slots.js";

export interface PlatformInputLogFile {
  formatVersion: number;
  slotId: RealInputLogSlot["slotId"];
  platform: string;
  capturedAt: string;
  synthetic: boolean;
  entries: CapturedInputLogEntry[];
}

export type PlatformLogIngestOutcome =
  | { ok: true; slot: RealInputLogSlot; entryCount: number; validated: true }
  | { ok: true; slot: RealInputLogSlot; entryCount: 0; validated: false; note: "empty-real-slot-allowed" }
  | { ok: false; detail: string };

export function validatePlatformInputLogFileShape(
  parsed: unknown,
): parsed is PlatformInputLogFile {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  if (o.formatVersion !== INPUT_EVIDENCE_FORMAT_VERSION) return false;
  if (typeof o.slotId !== "string" || typeof o.platform !== "string") return false;
  if (typeof o.capturedAt !== "string" || typeof o.synthetic !== "boolean") return false;
  if (!Array.isArray(o.entries)) return false;
  return true;
}

export function findRealInputLogSlot(slotId: string): RealInputLogSlot | undefined {
  return REAL_INPUT_LOG_SLOTS.find((s) => s.slotId === slotId);
}

/** Parse JSON text and validate against real-slot rules when entries present. */
export function ingestRealPlatformInputLog(jsonText: string): PlatformLogIngestOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    return { ok: false, detail: "invalid-json" };
  }
  if (!validatePlatformInputLogFileShape(parsed)) {
    return { ok: false, detail: "invalid-platform-log-shape" };
  }
  const slot = findRealInputLogSlot(parsed.slotId);
  if (!slot) {
    return { ok: false, detail: `unknown-slot:${parsed.slotId}` };
  }
  if (parsed.synthetic) {
    return { ok: false, detail: "real-ingestion-rejects-synthetic-file-flag" };
  }
  if (parsed.entries.length === 0) {
    return {
      ok: true,
      slot,
      entryCount: 0,
      validated: false,
      note: "empty-real-slot-allowed",
    };
  }
  const validation = validateRealPlatformInputLog(
    slot,
    parsed.entries,
    {
      platform: parsed.platform,
      capturedAt: parsed.capturedAt,
    },
  );
  if (!validation.ok) {
    return { ok: false, detail: JSON.stringify(validation) };
  }
  return { ok: true, slot, entryCount: parsed.entries.length, validated: true };
}
