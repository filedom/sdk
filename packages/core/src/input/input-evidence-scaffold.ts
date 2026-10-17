/** G3-INPUT-08: recorded IME/SR evidence file shapes + completeness checks (scaffold only). */

export const INPUT_EVIDENCE_FORMAT_VERSION = 1 as const;

export interface ImeEvidenceFixtureRecord {
  fixtureId: "IME-01" | "IME-02";
  platform: string;
  description: string;
  expectedDatasets: readonly string[];
  result: "not-run" | "pass" | "fail";
  logPath?: string | null;
  recordedAt?: string;
}

export interface ImeEvidenceFile {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  status: "not-run" | "partial" | "complete";
  fixtures: readonly ImeEvidenceFixtureRecord[];
  note?: string;
}

export interface SrEvidenceFixtureRecord {
  fixtureId: "SR-01";
  assistiveTech: string;
  scope: string;
  logPath: string | null;
  result: "not-run" | "pass" | "fail";
  recordedAt?: string;
}

export interface SrEvidenceFile {
  formatVersion: typeof INPUT_EVIDENCE_FORMAT_VERSION;
  recordedAt: string;
  status: "not-run" | "partial" | "complete";
  fixtures: readonly SrEvidenceFixtureRecord[];
  note?: string;
}

export type InputEvidenceScaffoldIssue =
  | { ok: false; kind: "format-version"; detail: string }
  | { ok: false; kind: "missing-field"; fixtureId: string; field: string }
  | { ok: false; kind: "empty-fixtures"; detail: string }
  | { ok: true; scaffoldComplete: boolean; allNotRun: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateImeEvidenceFile(raw: unknown): InputEvidenceScaffoldIssue {
  if (!isRecord(raw)) {
    return { ok: false, kind: "format-version", detail: "expected object" };
  }
  if (raw.formatVersion !== INPUT_EVIDENCE_FORMAT_VERSION) {
    return {
      ok: false,
      kind: "format-version",
      detail: `expected formatVersion ${INPUT_EVIDENCE_FORMAT_VERSION}`,
    };
  }
  if (!Array.isArray(raw.fixtures) || raw.fixtures.length === 0) {
    return { ok: false, kind: "empty-fixtures", detail: "fixtures[] required" };
  }
  const ids = new Set<string>();
  for (const fixture of raw.fixtures) {
    if (!isRecord(fixture)) {
      return { ok: false, kind: "missing-field", fixtureId: "?", field: "fixture" };
    }
    const fixtureId = String(fixture.fixtureId ?? "");
    if (!fixtureId) {
      return { ok: false, kind: "missing-field", fixtureId: "?", field: "fixtureId" };
    }
    ids.add(fixtureId);
    if (!Array.isArray(fixture.expectedDatasets) || fixture.expectedDatasets.length === 0) {
      return { ok: false, kind: "missing-field", fixtureId, field: "expectedDatasets" };
    }
  }
  if (!ids.has("IME-01") || !ids.has("IME-02")) {
    return {
      ok: false,
      kind: "missing-field",
      fixtureId: "IME-01|IME-02",
      field: "required fixture ids",
    };
  }
  const allNotRun = raw.fixtures.every(
    (f) => isRecord(f) && f.result === "not-run",
  );
  const scaffoldComplete =
    typeof raw.recordedAt === "string" &&
    typeof raw.status === "string" &&
    raw.fixtures.every((f) => isRecord(f) && typeof f.description === "string");
  return { ok: true, scaffoldComplete, allNotRun };
}

export function validateSrEvidenceFile(raw: unknown): InputEvidenceScaffoldIssue {
  if (!isRecord(raw)) {
    return { ok: false, kind: "format-version", detail: "expected object" };
  }
  if (raw.formatVersion !== INPUT_EVIDENCE_FORMAT_VERSION) {
    return {
      ok: false,
      kind: "format-version",
      detail: `expected formatVersion ${INPUT_EVIDENCE_FORMAT_VERSION}`,
    };
  }
  if (!Array.isArray(raw.fixtures) || raw.fixtures.length === 0) {
    return { ok: false, kind: "empty-fixtures", detail: "fixtures[] required" };
  }
  const hasSr01 = raw.fixtures.some(
    (f) => isRecord(f) && f.fixtureId === "SR-01",
  );
  if (!hasSr01) {
    return { ok: false, kind: "missing-field", fixtureId: "SR-01", field: "fixtureId" };
  }
  const allNotRun = raw.fixtures.every(
    (f) => isRecord(f) && f.result === "not-run",
  );
  const scaffoldComplete =
    typeof raw.recordedAt === "string" &&
    typeof raw.status === "string" &&
    raw.fixtures.every((f) => isRecord(f) && typeof f.scope === "string");
  return { ok: true, scaffoldComplete, allNotRun };
}
