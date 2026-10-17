import type { InputRegionState } from "./input-region.js";

export interface CompositionTransaction {
  id: string;
  region: InputRegionState;
  preedit: string;
  state: "active" | "committed" | "cancelled";
}

let compositionSeq = 0;

export function beginComposition(
  region: InputRegionState,
  preedit: string,
): CompositionTransaction {
  compositionSeq += 1;
  return {
    id: `ime-${compositionSeq}`,
    region: { ...region },
    preedit,
    state: "active",
  };
}

export function updateCompositionPreedit(
  txn: CompositionTransaction,
  preedit: string,
): CompositionTransaction {
  if (txn.state !== "active") return txn;
  return { ...txn, preedit };
}

/** Web-owned stub: records committed text length; no document mutation yet (G3 gate not-run). */
export function commitComposition(
  txn: CompositionTransaction,
): { txn: CompositionTransaction; region: InputRegionState; insertedLength: number } {
  const insertedLength = [...txn.preedit].length;
  const region: InputRegionState = {
    ...txn.region,
    caretOffset: txn.region.caretOffset + insertedLength,
  };
  return {
    txn: { ...txn, state: "committed", region },
    region,
    insertedLength,
  };
}

export function cancelComposition(txn: CompositionTransaction): CompositionTransaction {
  return { ...txn, state: "cancelled", preedit: "" };
}
