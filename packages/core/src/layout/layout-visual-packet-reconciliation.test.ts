import { describe, expect, it } from "vitest";
import { reconcileLayoutIndependentPngWithVisualAttestation } from "./layout-visual-packet-reconciliation.js";

describe("G2-LAYOUT-20 layout packet reconciliation", () => {
  it("flags reviewer mismatch between independent PNG and visual attestation", () => {
    const result = reconcileLayoutIndependentPngWithVisualAttestation({
      independentPngReview: { reviewerId: "reviewer-a", manifestSha256: "abc" },
      visualAttestation: { reviewerId: "reviewer-b", visualReviewAttested: true },
    });
    expect(result.status).toBe("reviewer-mismatch");
    expect(result.gateStatus).toBe("not-run");
  });

  it("reconciles when reviewer and coordinator manifest SHA align", () => {
    const sha = "ba2c7062c8c71ee28f2b9497aef179d583aacba27296b7d33d4dcf2dc0309c82";
    const result = reconcileLayoutIndependentPngWithVisualAttestation({
      independentPngReview: { reviewerId: "local-reviewer-stub", manifestSha256: sha },
      visualAttestation: {
        reviewerId: "local-reviewer-stub",
        visualReviewAttested: true,
      },
      coordinatorIndependentAccept: { coordinatorId: "coord-stub", independentReviewManifestSha256: sha },
    });
    expect(result.status).toBe("reconciled-not-gate-pass");
  });
});
