#!/usr/bin/env node
/**
 * G2-LAYOUT-19: coordinator accepts independent PNG review packet (distinct from G2-LAYOUT-16).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
const reviewPath = join(outDir, "layout-visual-independent-human-png-review.json");
const acceptedPath = join(outDir, "layout-visual-independent-png-review-coordinator-accepted.json");

const coordinatorAccept = (process.env.LAYOUT_INDEPENDENT_COORDINATOR_ACCEPT ?? "").trim() === "1";
const coordinatorId = process.env.LAYOUT_INDEPENDENT_COORDINATOR_ID?.trim();

if (!coordinatorAccept) {
  console.error(
    "[accept-layout-independent-png-review] set LAYOUT_INDEPENDENT_COORDINATOR_ACCEPT=1 (independent of LAYOUT_SIGNOFF_COORDINATOR_ACCEPT).",
  );
  process.exit(2);
}
if (!coordinatorId) {
  console.error(
    "[accept-layout-independent-png-review] LAYOUT_INDEPENDENT_COORDINATOR_ACCEPT=1 requires LAYOUT_INDEPENDENT_COORDINATOR_ID.",
  );
  process.exit(2);
}

if (!existsSync(reviewPath)) {
  console.log("[accept-layout-independent-png-review] independent PNG review missing — not-run");
  process.exit(0);
}

const review = JSON.parse(readFileSync(reviewPath, "utf8"));
const packet = {
  ...review,
  card: "G2-LAYOUT-19",
  coordinatorAccepted: true,
  coordinatorId,
  coordinatorAcceptedAt: new Date().toISOString(),
  independentOfG2Layout16CoordinatorAccept: true,
  gateStatus: "not-run",
  note: "G2-LAYOUT-19 coordinator accepted independent PNG review packet — NOT gate G2 pass or visual diff pass.",
};

writeFileSync(acceptedPath, `${JSON.stringify(packet, null, 2)}\n`);
console.log(`[accept-layout-independent-png-review] wrote ${acceptedPath}`);
