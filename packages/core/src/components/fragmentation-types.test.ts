import { describe, expect, it } from "vitest";
import { validateBreakToken } from "./fragmentation-types.js";

describe("W2-G4-01 fragmentation types", () => {
  it("validates break token ranges for queued G4 work", () => {
    expect(
      validateBreakToken(
        {
          fragmentId: { value: "f1" },
          sourceStart: 0,
          sourceEnd: 3,
          pageIndex: 0,
        },
        10,
      ),
    ).toBeNull();
    expect(
      validateBreakToken(
        { fragmentId: { value: "f1" }, sourceStart: 4, sourceEnd: 2, pageIndex: 0 },
        10,
      ),
    ).toBe("inverted-range");
  });
});
