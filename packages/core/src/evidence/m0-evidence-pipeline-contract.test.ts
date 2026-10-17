import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMDOC_PACKAGE_SCHEMA_VERSION } from "../persistence/domdoc-package-stub.js";
import { INPUT_EVIDENCE_FORMAT_VERSION } from "../input/input-evidence-scaffold.js";

const webRoot = join(import.meta.dirname, "../../../..");

/** M0 blueprint §12.10 — evidence pipeline + frozen package schema contracts (not gate pass). */
describe("M0 evidence pipeline contract", () => {
  it("freezes domdoc package schema version (§13.3)", () => {
    expect(DOMDOC_PACKAGE_SCHEMA_VERSION).toBe(1);
  });

  it("feature registry carries contract hash aligned with render-wire schema", () => {
    const registry = JSON.parse(
      readFileSync(join(webRoot, "docs/feature-registry.json"), "utf8"),
    ) as { contractHash: string; features: unknown[] };
    expect(registry.contractHash).toMatch(/^[a-f0-9]{64}$/);
    expect(registry.features.length).toBe(164);
    const ids = registry.features.map((f: { id: string }) => f.id);
    expect(ids[0]).toBe("F01");
    expect(ids[163]).toBe("F164");
  });

  it("feasibility gate records stay not-run until native proofs; G1 may pass M0 subset", () => {
    for (const gateId of ["G1", "G2", "G3", "G4", "G5"]) {
      const record = JSON.parse(
        readFileSync(
          join(webRoot, "evidence/gates", `${gateId}-feasibility`, "gate-record.json"),
          "utf8",
        ),
      ) as { status: string; requiredFixtureIds?: string[] };
      if (gateId === "G1" && record.status === "passed") {
        const proofs = JSON.parse(
          readFileSync(
            join(webRoot, "evidence/gates/G1-feasibility/p01-p05-vendor-proofs.json"),
            "utf8",
          ),
        ) as {
          writerExportsReady?: boolean;
          fixtures: { fixtureId: string; nativeProof: string }[];
        };
        expect(proofs.writerExportsReady).toBe(true);
        const required = record.requiredFixtureIds ?? ["P01", "P02", "P03", "P04", "P05", "P11", "P12"];
        for (const id of required) {
          expect(proofs.fixtures.find((f) => f.fixtureId === id)?.nativeProof).toBe("pass");
        }
        continue;
      }
      expect(record.status).toBe("not-run");
    }
  });

  it("input evidence format version is stable for log slots", () => {
    expect(INPUT_EVIDENCE_FORMAT_VERSION).toBeGreaterThan(0);
  });
});
