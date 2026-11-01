// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { BundleLoader } from "./bundles.js";
import { DomdocError } from "./errors.js";
import { openDocument } from "./open.js";

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

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

  it("opens audio, video, archive, email, and csv through their bundles", async () => {
    const opened: string[] = [];
    const moduleFor = (format: string) => async () => ({
      default: async () => {},
      format: () => format,
      open() {
        opened.push(format);
        return {
          info: () => JSON.stringify({ format, pageCount: 1, capabilities: {}, warnings: [] }),
          free: () => {},
        } as never;
      },
    });
    const loader = new BundleLoader({
      mp3: moduleFor("mp3"),
      mp4: moduleFor("mp4"),
      zip: moduleFor("zip"),
      eml: moduleFor("eml"),
      csv: moduleFor("csv"),
    });
    const docs = [
      await openDocument(loader, ascii("ID3"), { name: "a.mp3" }),
      await openDocument(loader, ascii("\0\0\0\x18ftypisom"), { name: "film.bin" }),
      await openDocument(loader, new Uint8Array([0x50, 0x4b, 0x03, 0x04]), { name: "photos.zip" }),
      await openDocument(loader, ascii("Received: from example\r\n"), { name: "mail.txt" }),
      await openDocument(loader, ascii("a,b\n"), { name: "rows.csv" }),
    ];
    expect(docs.map((doc) => doc.format)).toEqual(["mp3", "mp4", "zip", "eml", "csv"]);
    expect(opened).toEqual(["mp3", "mp4", "zip", "eml", "csv"]);
    for (const doc of docs) doc.dispose();

    await expect(openDocument(new BundleLoader({}), ascii("ID3"), { name: "a.mp3" })).rejects.toMatchObject({
      code: "bundle-missing",
      detail: "mp3",
    });
  });
});
