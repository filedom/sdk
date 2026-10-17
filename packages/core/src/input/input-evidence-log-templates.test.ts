import { describe, expect, it } from "vitest";
import {
  IME_LOG_CAPTURE_TEMPLATES,
  SR_LOG_CAPTURE_TEMPLATES,
  buildImeEvidenceFileFromSyntheticLog,
  validateCapturedImeLog,
  validateCapturedSrLog,
  type CapturedInputLogEntry,
} from "./input-evidence-log-templates.js";
import { validateImeEvidenceFile } from "./input-evidence-scaffold.js";

const syntheticImeEntries: CapturedInputLogEntry[] = [
  {
    ts: "2026-10-17T09:00:00.000Z",
    eventType: "compositionstart",
    synthetic: true,
    fields: { "data-composition-state": "active" },
  },
  {
    ts: "2026-10-17T09:00:01.000Z",
    eventType: "compositionupdate",
    synthetic: true,
    fields: { "data-composition-preedit": "あ" },
  },
  {
    ts: "2026-10-17T09:00:02.000Z",
    eventType: "compositionend",
    synthetic: true,
    fields: { "data-composition-state": "committed", "data-caret-offset": 1 },
  },
];

describe("G3-INPUT-09 log capture templates", () => {
  it("validates synthetic IME log against macOS IME-01 template", () => {
    const template = IME_LOG_CAPTURE_TEMPLATES.find((t) => t.templateId === "IME-01")!;
    const verdict = validateCapturedImeLog(template, syntheticImeEntries);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.synthetic).toBe(true);
      expect(verdict.eventCount).toBe(3);
    }
  });

  it("builds partial IME evidence file from synthetic log (still not-run for gate)", () => {
    const template = IME_LOG_CAPTURE_TEMPLATES.find((t) => t.templateId === "IME-01")!;
    const file = buildImeEvidenceFileFromSyntheticLog(template, syntheticImeEntries);
    expect(file.status).toBe("partial");
    expect(file.note).toContain("Synthetic");
    const scaffold = validateImeEvidenceFile({
      ...file,
      fixtures: [
        ...file.fixtures,
        {
          fixtureId: "IME-02",
          platform: "manual",
          description: "placeholder for scaffold completeness",
          expectedDatasets: ["data-caret-offset"],
          result: "not-run",
        },
      ],
    });
    expect(scaffold.ok).toBe(true);
  });

  it("validates synthetic SR log against SR-01 template", () => {
    const template = SR_LOG_CAPTURE_TEMPLATES[0]!;
    const entries: CapturedInputLogEntry[] = [
      { ts: "t0", eventType: "focusin", synthetic: true, fields: { role: "textbox" } },
      { ts: "t1", eventType: "aria-live", synthetic: true, fields: { name: "editor" } },
      { ts: "t2", eventType: "selectionchange", synthetic: true, fields: { caretDescription: "line 1" } },
    ];
    const verdict = validateCapturedSrLog(template, entries);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.synthetic).toBe(true);
  });
});
