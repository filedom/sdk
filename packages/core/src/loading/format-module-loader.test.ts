import { describe, expect, it, vi } from "vitest";
import { FormatModuleLoader } from "./format-module-loader.js";

describe("FormatModuleLoader (Appendix A AP dedupe)", () => {
  it("dedupes concurrent loads of the same module", async () => {
    const loader = new FormatModuleLoader();
    const fn = vi.fn(async () => ({ ok: true }));
    loader.register("docx-adapter", fn);
    const [a, b] = await Promise.all([
      loader.load("docx-adapter", 1),
      loader.load("docx-adapter", 1),
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("records failure and allows resetFailed retry", async () => {
    const loader = new FormatModuleLoader();
    let calls = 0;
    loader.register("pdf-display", async () => {
      calls += 1;
      if (calls === 1) throw new Error("network");
      return { ready: true };
    });
    await expect(loader.load("pdf-display", 1)).rejects.toThrow("network");
    expect(loader.snapshot().find((r) => r.id === "pdf-display")?.status).toBe("failed");
    loader.resetFailed("pdf-display");
    await expect(loader.load("pdf-display", 2)).resolves.toEqual({ ready: true });
  });
});
