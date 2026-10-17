import { describe, expect, it } from "vitest";
import {
  beginComposition,
  cancelComposition,
  commitComposition,
  updateCompositionPreedit,
} from "./composition-stub.js";

describe("G3-INPUT-03 composition transaction stub", () => {
  it("tracks preedit updates and commit caret advance", () => {
    const region = { pageIndex: 0, runId: "r1", caretOffset: 2 };
    let txn = beginComposition(region, "あ");
    txn = updateCompositionPreedit(txn, "あい");
    expect(txn.state).toBe("active");
    const committed = commitComposition(txn);
    expect(committed.txn.state).toBe("committed");
    expect(committed.region.caretOffset).toBe(4);
    expect(committed.insertedLength).toBe(2);
  });

  it("cancel clears preedit without advancing caret", () => {
    const txn = cancelComposition(
      beginComposition({ pageIndex: 0, runId: "r", caretOffset: 1 }, "x"),
    );
    expect(txn.state).toBe("cancelled");
    expect(txn.preedit).toBe("");
  });
});
