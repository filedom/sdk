/**
 * G3-INPUT-22 happy-dom: IME composition + accessibility probe on hidden input.
 * Synthetic only — labeled gate-grade logs require physical host capture.
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  beginComposition,
  commitComposition,
  updateCompositionPreedit,
} from "../editing/composition-stub.js";

describe("compositor a11y + IME simulation (happy-dom)", () => {
  it("dispatches composition events on aria-labeled probe input", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "domdoc-ime-input";
    input.setAttribute("aria-label", "domdoc composition probe");
    document.body.appendChild(input);

    const region = { pageIndex: 0, runId: "run-a11y", caretOffset: 0 };
    let txn = beginComposition(region, "");
    input.addEventListener("compositionupdate", (event) => {
      txn = updateCompositionPreedit(txn, (event as CompositionEvent).data ?? "");
    });

    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    input.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "あ" }));
    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
    txn = updateCompositionPreedit(txn, "あ");
    const committed = commitComposition(txn);
    expect(committed.insertedLength).toBe(1);
    expect(input.getAttribute("aria-label")).toContain("composition");

    input.remove();
  });
});
