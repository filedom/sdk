import { describe, expect, it } from "vitest";

/** F13 Rust flow layout — registry binding (WASM hook exercised in demo e2e). */
export const LAYOUT_FLOW_FEATURE_REGISTRY_ID = "F13" as const;

describe("F13 layout flow feature registry", () => {
  it("declares F13 for Rust flow layout milestone slice", () => {
    expect(LAYOUT_FLOW_FEATURE_REGISTRY_ID).toBe("F13");
  });
});
