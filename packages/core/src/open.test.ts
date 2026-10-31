// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import { DomdocError } from "./errors.js";
import { openDocument } from "./open.js";

describe("openDocument password retry", () => {
  it("prompts and retries pdf-encrypted with the supplied password", async () => {
    let calls = 0;
    const loader = new BundleLoader({
      pdf: async () => ({
        default: async () => {},
        format: () => "pdf",
        open(bytes: Uint8Array, password?: string) {
          calls += 1;
          if (password !== "secret") throw new Error("pdf-encrypted: password-protected PDF");
          return {
            info: () => JSON.stringify({ format: "pdf", pageCount: 1, capabilities: {}, warnings: [] }),
            free: () => {},
          } as never;
        },
      }),
    });

    const getPassword = vi.fn(async () => "secret");
    const doc = await openDocument(loader, new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      name: "locked.pdf",
      getPassword,
    });
    expect(doc.format).toBe("pdf");
    expect(calls).toBe(2);
    expect(getPassword).toHaveBeenCalledOnce();
    doc.dispose();
  });

  it("refuses the open when the password prompt is cancelled", async () => {
    const loader = new BundleLoader({
      pdf: async () => ({
        default: async () => {},
        format: () => "pdf",
        open() {
          throw new Error("pdf-encrypted: password-protected PDF");
        },
      }),
    });
    await expect(
      openDocument(loader, new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        name: "locked.pdf",
        getPassword: async () => null,
      }),
    ).rejects.toMatchObject({ code: "pdf-encrypted" } satisfies Partial<DomdocError>);
  });
});
