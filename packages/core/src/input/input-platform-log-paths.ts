/** G3-INPUT-13: real platform log file paths (empty vs filled validation). */

import { ingestRealPlatformInputLog } from "./input-platform-log-ingestion.js";
import {
  REAL_INPUT_LOG_SLOTS,
  REAL_PLATFORM_LOG_RELATIVE_PATHS,
  type RealInputLogSlot,
} from "./input-evidence-real-log-slots.js";

export { REAL_PLATFORM_LOG_RELATIVE_PATHS };

export type RealPlatformLogPathValidation =
  | { slotId: RealInputLogSlot["slotId"]; status: "missing-file"; logPath: string }
  | { slotId: RealInputLogSlot["slotId"]; status: "empty-validated"; logPath: string }
  | { slotId: RealInputLogSlot["slotId"]; status: "filled-validated"; logPath: string; entryCount: number }
  | { slotId: RealInputLogSlot["slotId"]; status: "invalid"; logPath: string; detail: string };

export function resolveRealPlatformLogPath(slotId: RealInputLogSlot["slotId"]): string {
  return REAL_PLATFORM_LOG_RELATIVE_PATHS[slotId];
}

/** Validate on-disk log files for all real slots (empty allowed; filled must pass ingestion). */
export function validateRealPlatformLogPaths(
  readUtf8: (relativePath: string) => string | null,
): readonly RealPlatformLogPathValidation[] {
  return REAL_INPUT_LOG_SLOTS.map((slot) => {
    const logPath = resolveRealPlatformLogPath(slot.slotId);
    const text = readUtf8(logPath);
    if (text == null) {
      return { slotId: slot.slotId, status: "missing-file", logPath };
    }
    const outcome = ingestRealPlatformInputLog(text);
    if (!outcome.ok) {
      return { slotId: slot.slotId, status: "invalid", logPath, detail: outcome.detail };
    }
    if (outcome.entryCount === 0) {
      return { slotId: slot.slotId, status: "empty-validated", logPath };
    }
    return {
      slotId: slot.slotId,
      status: "filled-validated",
      logPath,
      entryCount: outcome.entryCount,
    };
  });
}
