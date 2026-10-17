import { describe, expect, it } from "vitest";
import { describeDomdocDemoExportPath } from "./domdoc-export-path-selection.js";

describe("M1 domdoc export path selection (demo)", () => {
  it("defaults to domdoc-package envelope", () => {
    const path = describeDomdocDemoExportPath(null);
    expect(path.policy).toBe("domdoc-package");
    expect(path.implemented).toBe(true);
    expect(path.usesDomdocPackageEnvelope).toBe(true);
  });

  it("maps enhanced-native query to stub label", () => {
    const path = describeDomdocDemoExportPath("enhanced-native");
    expect(path.policy).toBe("enhanced-native-stub");
    expect(path.implemented).toBe(false);
    expect(path.usesDomdocPackageEnvelope).toBe(false);
  });
});
