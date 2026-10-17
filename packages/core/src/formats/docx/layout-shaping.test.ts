import { describe, expect, it } from "vitest";

describe("G2-LAYOUT-02 shaping export", () => {
  it("shaped JSON export matches flow export for same paragraph", async () => {
    const wasm = await import("domdoc-wasm");
    const input = {
      paragraph_id: "p",
      text: "one two three four five six",
      max_width_pt: 40,
      font_size_pt: 10,
    };
    const flowJson = wasm.layout_flow_paragraph_json(JSON.stringify(input));
    const shapedJson = wasm.layout_flow_paragraph_shaped_json(JSON.stringify(input));
    expect(shapedJson).toBe(flowJson);
    const lines = JSON.parse(String(flowJson)) as unknown[];
    expect(lines.length).toBeGreaterThan(1);
  });
});
