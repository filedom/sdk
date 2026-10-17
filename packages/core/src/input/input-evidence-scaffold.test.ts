import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  validateImeEvidenceFile,
  validateSrEvidenceFile,
} from "./input-evidence-scaffold.js";

const evidenceRoot = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../evidence/gates/G3-feasibility",
);

describe("G3-INPUT-08 input evidence scaffold", () => {
  it("validates committed IME fixture file shape", () => {
    const raw = JSON.parse(
      readFileSync(join(evidenceRoot, "ime-01-02-fixtures.json"), "utf8"),
    );
    const verdict = validateImeEvidenceFile(raw);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.scaffoldComplete).toBe(true);
      expect(verdict.allNotRun).toBe(true);
    }
  });

  it("validates committed SR scaffold file shape", () => {
    const raw = JSON.parse(
      readFileSync(join(evidenceRoot, "sr-evidence-scaffold.json"), "utf8"),
    );
    const verdict = validateSrEvidenceFile(raw);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.scaffoldComplete).toBe(true);
      expect(verdict.allNotRun).toBe(true);
    }
  });
});
