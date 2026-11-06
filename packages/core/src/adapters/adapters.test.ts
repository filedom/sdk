import { afterEach, describe, expect, it } from "vitest";
import { FiledomError } from "../errors.js";
import {
  adapterExtensions,
  adapterModules,
  convertWithAdapter,
  hasOpenAdapter,
  presentAdapter,
  setPackageImporter,
  writeAdapter,
} from "./index.js";
import { encodeQoi } from "./codecs.js";
import { ADAPTER_SUFFIXES, LICENSE_EXCLUDED_SUFFIXES } from "./suffixes.js";
import { writeZip } from "./zip-bytes.js";

afterEach(() => setPackageImporter(undefined));

function qoiPixel(): Uint8Array {
  return encodeQoi({ width: 1, height: 1, pixels: Uint8ClampedArray.of(10, 20, 30, 255) });
}

describe("file adapters", () => {
  it("opens a QOI file as PNG and writes QOI again", async () => {
    const presented = await presentAdapter(qoiPixel(), "pixel.qoi");
    expect(presented.displayName).toBe("pixel.png");
    expect([...presented.bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const written = await writeAdapter(presented.opened, "qoi");
    expect(written && [...written.slice(0, 4)]).toEqual([0x71, 0x6f, 0x69, 0x66]);
  });

  it("reads farbfeld, netpbm, rtf, mailbox, and a stored OpenDocument", async () => {
    const ff = new Uint8Array(24);
    ff.set(new TextEncoder().encode("farbfeld"));
    ff[11] = 1;
    ff[15] = 1;
    ff[16] = 255;
    const farbfeld = await presentAdapter(ff, "dot.ff");
    expect(farbfeld.displayName.endsWith(".png")).toBe(true);

    const ppm = new TextEncoder().encode("P6\n1 1\n255\n");
    const ppmBytes = new Uint8Array(ppm.length + 3);
    ppmBytes.set(ppm);
    ppmBytes[ppm.length] = 1;
    ppmBytes[ppm.length + 1] = 2;
    ppmBytes[ppm.length + 2] = 3;
    const painted = await presentAdapter(ppmBytes, "dot.ppm");
    expect(painted.opened.image?.pixels[0]).toBe(1);

    const rtf = await presentAdapter(new TextEncoder().encode("{\\rtf1 Hello\\par}"), "note.rtf");
    expect(new TextDecoder().decode(rtf.bytes)).toContain("Hello");

    const mail = await presentAdapter(
      new TextEncoder().encode("From a@b.test\nFrom: a@b.test\nSubject: Hi\n\nBody\n"),
      "box.mbox",
    );
    expect(new TextDecoder().decode(mail.bytes)).toContain("Hi");

    const content = new TextEncoder().encode("<office:text><text:p>Sheet</text:p></office:text>");
    const odt = writeZip([{ name: "content.xml", bytes: content }]);
    const opened = await presentAdapter(odt, "page.odt");
    expect(new TextDecoder().decode(opened.bytes)).toContain("Sheet");
  });

  it("uses the library result when that package is installed", async () => {
    setPackageImporter(async (specifier) => {
      if (specifier !== "rtf-viewer") throw new FiledomError("unsupported", `${specifier} is not loaded`);
      return { RtfDocument: { load: async () => ({ text: "from library" }) } };
    });
    const opened = await presentAdapter(new TextEncoder().encode("{\\rtf1 ignored}"), "note.rtf");
    expect(new TextDecoder().decode(opened.bytes)).toContain("from library");
  });

  it("keeps open and edit apart when the libraries differ", () => {
    const modules = adapterModules();
    expect(modules.find((module) => module.id === "avif-open")?.role).toBe("open");
    expect(modules.find((module) => module.id === "avif-edit")?.role).toBe("edit");
    expect(modules.find((module) => module.id === "jxl-open")?.extensions).toEqual(["jxl"]);
    expect(modules.find((module) => module.id === "jxl-edit")?.writes).toEqual(["jxl"]);
    expect(modules.find((module) => module.id === "jpeg2000-open")?.role).toBe("open");
    expect(modules.find((module) => module.id === "jpeg2000-edit")?.role).toBe("edit");
    expect(modules.find((module) => module.id === "hwp")?.role).toBe("both");
    expect(modules.find((module) => module.id === "hwp-pdf")?.writes).toEqual(["pdf"]);
    expect(modules.find((module) => module.id === "odf")?.role).toBe("both");
    expect(modules.find((module) => module.id === "pcm-wav")?.role).toBe("edit");
    expect(new Set(adapterExtensions())).toEqual(new Set(ADAPTER_SUFFIXES));
    expect(adapterExtensions()).toHaveLength(53);
    for (const suffix of LICENSE_EXCLUDED_SUFFIXES) {
      expect(hasOpenAdapter(`photo.${suffix}`)).toBe(false);
    }
  });

  it("calls each library with the arguments that library exports", async () => {
    const seen: string[] = [];
    setPackageImporter(async (specifier) => {
      if (specifier === "epub-gen-memory") {
        return {
          default: async (options: { title: string }, content: { content: string }[]) => {
            seen.push(`epub:${options.title}:${content[0]?.content}`);
            return new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
          },
        };
      }
      if (specifier === "@docmux/wasm") {
        return {
          convert: async (input: string, from: string, to: string) => {
            seen.push(`docmux:${from}:${to}:${input}`);
            return { output: "<p>ok</p>", error: null };
          },
        };
      }
      if (specifier === "@firecrawl/anydoc-wasm") {
        return {
          default: async () => {
            seen.push("anydoc-init");
          },
          toMarkdownBytes: (bytes: Uint8Array, format?: string) => {
            seen.push(`anydoc:${format}:${bytes.byteLength}`);
            return "# note";
          },
        };
      }
      if (specifier === "seek-bzip") {
        const decode = (data: Uint8Array) => {
          seen.push(`bz2:${data.byteLength}`);
          return new Uint8Array([1, 2, 3]);
        };
        const bunzip = function Bunzip() {
          return undefined;
        };
        (bunzip as unknown as { decode: typeof decode }).decode = decode;
        return { default: bunzip };
      }
      if (specifier === "xz-decompress") {
        return {
          XzReadableStream: class {
            constructor(stream: ReadableStream<Uint8Array>) {
              seen.push(`xz:${stream.locked ? 1 : 0}`);
            }
            getReader() {
              let sent = false;
              return {
                read: async () => (sent ? { done: true as const, value: undefined } : ((sent = true), { done: false as const, value: new Uint8Array([9]) })),
              };
            }
          },
        };
      }
      if (specifier === "exrs") {
        return {
          init: async () => {
            seen.push("exr-init");
          },
          decodeRgbaExr: () => ({ width: 1, height: 1, interleavedRgbaPixels: Float32Array.of(1, 0, 0, 1) }),
          encodeRgbaExr: (image: { interleavedRgbaPixels: Float32Array }) => {
            seen.push(`exr-write:${image.interleavedRgbaPixels[0]}`);
            return new Uint8Array([0x76, 0x2f, 0x31, 0x01]);
          },
        };
      }
      throw new FiledomError("unsupported", `${specifier} is not loaded`);
    });

    const epub = await convertWithAdapter(new TextEncoder().encode("<p>Hi</p>"), "page.html", "epub");
    expect([...epub.slice(0, 2)]).toEqual([0x50, 0x4b]);
    expect(seen).toContain("epub:page.html:<p>Hi</p>");

    const html = await convertWithAdapter(new TextEncoder().encode("# title"), "note.md", "html");
    expect(new TextDecoder().decode(html)).toBe("<p>ok</p>");
    expect(seen).toContain("docmux:md:html:# title");

    const markdown = await convertWithAdapter(new TextEncoder().encode("word"), "memo.doc", "md");
    expect(new TextDecoder().decode(markdown)).toBe("# note");
    expect(seen).toContain("anydoc-init");
    expect(seen).toContain("anydoc:doc:4");

    const bz2 = await presentAdapter(new Uint8Array([1, 2]), "pack.bz2");
    expect(bz2.opened.entries?.[0]?.bytes).toEqual(new Uint8Array([1, 2, 3]));

    const xz = await presentAdapter(new Uint8Array([4]), "pack.xz");
    expect(xz.opened.entries?.[0]?.bytes).toEqual(new Uint8Array([9]));

    const exr = await presentAdapter(new Uint8Array([0]), "shot.exr");
    expect(exr.opened.image?.pixels[0]).toBe(255);
    const written = await writeAdapter(exr.opened, "exr");
    expect(written?.[0]).toBe(0x76);
    expect(seen).toContain("exr-write:1");
  });

  it("returns unsupported when a write package is absent", async () => {
    const opened = await presentAdapter(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), "mark.svg").catch(
      () => undefined,
    );
    expect(opened).toBeUndefined();
    await expect(convertWithAdapter(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), "mark.svg", "pdf")).rejects.toMatchObject({
      code: "unsupported",
    });
  });
});
