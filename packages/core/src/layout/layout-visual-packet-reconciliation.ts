/** G2-LAYOUT-20: reconcile independent PNG review vs visual attestation packets (not gate pass). */

export interface LayoutIndependentPngReviewPacket {
  card?: string;
  gateStatus?: string;
  reviewKind?: string;
  independentOfCiAttestation?: boolean;
  reviewerId?: string;
  manifestSha256?: string;
}

export interface LayoutVisualAttestationPacket {
  card?: string;
  humanReviewStatus?: string;
  visualReviewAttested?: boolean;
  signedChecksumSha256?: string;
  reviewerId?: string;
}

export interface LayoutIndependentPngCoordinatorAccepted {
  coordinatorId?: string;
  independentReviewManifestSha256?: string;
}

export type LayoutPacketReconciliationStatus =
  | "not-run"
  | "packets-missing"
  | "reviewer-mismatch"
  | "manifest-checksum-mismatch"
  | "reconciled-not-gate-pass";

export interface LayoutVisualPacketReconciliation {
  card: "G2-LAYOUT-20";
  gateStatus: "not-run";
  status: LayoutPacketReconciliationStatus;
  independentPngReviewPresent: boolean;
  visualAttestationPresent: boolean;
  coordinatorIndependentAcceptPresent: boolean;
  note: string;
}

export function reconcileLayoutIndependentPngWithVisualAttestation(input: {
  independentPngReview?: LayoutIndependentPngReviewPacket | null;
  visualAttestation?: LayoutVisualAttestationPacket | null;
  coordinatorIndependentAccept?: LayoutIndependentPngCoordinatorAccepted | null;
}): LayoutVisualPacketReconciliation {
  const independentPngReviewPresent = input.independentPngReview != null;
  const visualAttestationPresent = input.visualAttestation != null;
  const coordinatorIndependentAcceptPresent = input.coordinatorIndependentAccept != null;

  if (!independentPngReviewPresent && !visualAttestationPresent) {
    return {
      card: "G2-LAYOUT-20",
      gateStatus: "not-run",
      status: "packets-missing",
      independentPngReviewPresent,
      visualAttestationPresent,
      coordinatorIndependentAcceptPresent,
      note: "G2-LAYOUT-20 no layout review packets to reconcile; gate G2 not-run.",
    };
  }

  if (independentPngReviewPresent && visualAttestationPresent) {
    const ind = input.independentPngReview!;
    const vis = input.visualAttestation!;
    if (
      ind.reviewerId &&
      vis.reviewerId &&
      ind.reviewerId !== vis.reviewerId
    ) {
      return {
        card: "G2-LAYOUT-20",
        gateStatus: "not-run",
        status: "reviewer-mismatch",
        independentPngReviewPresent,
        visualAttestationPresent,
        coordinatorIndependentAcceptPresent,
        note: "G2-LAYOUT-20 independent PNG reviewer differs from visual attestation reviewer; coordinator required.",
      };
    }
    if (
      ind.manifestSha256 &&
      input.coordinatorIndependentAccept?.independentReviewManifestSha256 &&
      ind.manifestSha256 !== input.coordinatorIndependentAccept.independentReviewManifestSha256
    ) {
      return {
        card: "G2-LAYOUT-20",
        gateStatus: "not-run",
        status: "manifest-checksum-mismatch",
        independentPngReviewPresent,
        visualAttestationPresent,
        coordinatorIndependentAcceptPresent,
        note: "G2-LAYOUT-20 coordinator accept manifest SHA does not match independent PNG review manifest.",
      };
    }
  }

  return {
    card: "G2-LAYOUT-20",
    gateStatus: "not-run",
    status: independentPngReviewPresent && visualAttestationPresent ? "reconciled-not-gate-pass" : "not-run",
    independentPngReviewPresent,
    visualAttestationPresent,
    coordinatorIndependentAcceptPresent,
    note:
      "G2-LAYOUT-20 packets reconciled for workflow tracking only; independent PNG review ≠ LAYOUT_SIGNOFF visual attestation; gate G2 not-run.",
  };
}
