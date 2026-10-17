import { describe, expect, it } from "vitest";
import {
  AF_BROWSER_CORPUS,
  afCorpusAllConverged,
  evaluateAfBrowserCorpus,
} from "./fragmentation-af-browser-corpus.js";

describe("W2-G4-05 AF browser corpus", () => {
  it("converges when shaped layout JSON is deterministic", () => {
    const shaped = (payload: string) => {
      const input = JSON.parse(payload) as { text: string };
      return JSON.stringify([
        { text: input.text, width_pt: 80, height_pt: 14, line_index: 0 },
      ]);
    };
    const verdicts = evaluateAfBrowserCorpus(shaped);
    expect(verdicts).toHaveLength(AF_BROWSER_CORPUS.length);
    expect(afCorpusAllConverged(verdicts)).toBe(true);
  });
});
