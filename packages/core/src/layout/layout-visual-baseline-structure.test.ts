import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const evidenceDir = join(
  import.meta.dirname,
  "../../../../evidence/gates/G2-feasibility",
);

describe("G2-LAYOUT-09 visual baseline structure", () => {
  it("manifest and markdown baselines exist when JSON diff was recorded", () => {
    const diffPath = join(evidenceDir, "layout-shaped-flow-visual-diff.json");
    expect(existsSync(diffPath)).toBe(true);
    const diff = JSON.parse(readFileSync(diffPath, "utf8")) as {
      status: string;
      entries: unknown[];
    };
    if (diff.status !== "recorded-json-snapshots") return;

    const manifestPath = join(evidenceDir, "layout-visual-baseline-manifest.json");
    const mdPath = join(evidenceDir, "layout-visual-baselines.md");
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(mdPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      entries: { corpusId: string }[];
      humanReviewStatus: string;
    };
    expect(manifest.entries.length).toBe(diff.entries.length);
    expect(manifest.humanReviewStatus).toBe("pending");
    expect(readFileSync(mdPath, "utf8")).toContain("LV-01");
  });
});
