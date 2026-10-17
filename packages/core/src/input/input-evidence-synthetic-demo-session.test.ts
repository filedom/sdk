import { describe, expect, it } from "vitest";
import {
  validateSyntheticDemoInputSessionFile,
  type SyntheticDemoInputSessionFile,
} from "./input-evidence-synthetic-demo-session.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "./input-evidence-scaffold.js";

const imeSession: SyntheticDemoInputSessionFile = {
  formatVersion: INPUT_EVIDENCE_FORMAT_VERSION,
  sessionKind: "synthetic-demo-ime",
  synthetic: true,
  platform: "macos",
  capturedAt: "2026-10-17T09:00:00.000Z",
  demoSessionId: "demo-sess-synthetic-ime",
  hostLabel: "domdoc-demo-shell-stub",
  entries: [
    { ts: "t0", eventType: "compositionstart", synthetic: true, fields: { data: "" } },
    { ts: "t1", eventType: "compositionupdate", synthetic: true, fields: { data: "あ" } },
    { ts: "t2", eventType: "compositionend", synthetic: true, fields: { data: "あ" } },
    { ts: "t3", eventType: "input", synthetic: true, fields: { inputType: "insertCompositionText" } },
  ],
};

describe("G3-INPUT-16 synthetic demo session validator", () => {
  it("accepts fuller synthetic IME demo session", () => {
    const verdict = validateSyntheticDemoInputSessionFile(imeSession);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.eventCount).toBe(4);
  });

  it("rejects session without synthetic flag", () => {
    const verdict = validateSyntheticDemoInputSessionFile({
      ...imeSession,
      synthetic: false as unknown as true,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.kind).toBe("synthetic-flag-required");
  });
});
