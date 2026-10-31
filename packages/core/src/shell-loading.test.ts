// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { EngineModule } from "./engine-types.js";
import { CoreLoader, type EngineSources } from "./modules.js";
import { DomdocViewer } from "./viewer.js";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function engine(): EngineModule {
  return {
    default: async () => {},
    format: () => "pdf",
    open() {
      return {
        info: () => JSON.stringify({ format: "pdf", pageCount: 1, capabilities: {}, warnings: [], trackChanges: false }),
        handle: () => "[]",
        free: () => {},
      } as never;
    },
  };
}

describe("empty layout while engines load", () => {
  it("keeps a blank page and spinner up until the PDF engines finish", async () => {
    let releaseCore!: () => void;
    const coreGate = new Promise<void>((resolve) => {
      releaseCore = resolve;
    });
    const officeOxide = vi.fn(async () => engine());
    const sources: EngineSources = {
      core: () => coreGate,
      pdfiumRender: async () => engine(),
      officeOxide,
    };

    const root = document.createElement("div");
    document.body.append(root);
    const viewer = new DomdocViewer(root, {
      bundles: {},
      core: new CoreLoader({ pdf: true, docx: true }, sources),
    });

    const opening = viewer.open(PDF, { name: "notes.pdf" });
    await Promise.resolve();
    await Promise.resolve();

    const loading = root.querySelector(".dd-loading");
    expect(loading?.hasAttribute("hidden")).toBe(false);
    expect(root.querySelector(".dd-sheet")).toBeTruthy();
    expect(root.querySelector(".dd-spinner")).toBeTruthy();
    expect(root.querySelector(".dd-loading-label")?.textContent).toBe("Loading PDF");
    expect(root.querySelector(".dd-empty")?.hasAttribute("hidden")).toBe(true);
    expect(officeOxide).not.toHaveBeenCalled();

    releaseCore();
    await opening.catch(() => undefined);
    expect(root.querySelector(".dd-loading")?.hasAttribute("hidden")).toBe(true);
    viewer.destroy();
  });
});
