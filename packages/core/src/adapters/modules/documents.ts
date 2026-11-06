import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { rtfText, xmlText } from "../codecs.js";
import { isUnsupported, loadPackage, tryPackage } from "../load.js";
import { openedFile } from "../session.js";
import { DOCUMENT_ADAPTERS } from "../suffixes.js";
import { asBytes, asText, extensionOf, pickFn } from "../variation.js";
import { readZip } from "../zip-bytes.js";

const [rtf, odt, ods, odp, hwp, hwpx, pages, numbers, key] = DOCUMENT_ADAPTERS;

async function zipText(bytes: Uint8Array, names: readonly string[]): Promise<string> {
  const entries = await readZip(bytes);
  const wanted = names.map((name) => name.toLowerCase());
  const chosen = entries.filter((entry) => wanted.some((name) => entry.name.toLowerCase().endsWith(name)));
  const text = chosen.map((entry) => xmlText(entry.bytes)).filter(Boolean).join("\n\n");
  return text;
}

export const rtfOpen: AdapterModule = {
  id: "rtf-open",
  role: "open",
  extensions: [rtf],
  async open(bytes, name) {
    const fromLibrary = await tryPackage("rtf-viewer", async (mod) => {
      try {
        const ctor = mod.RtfDocument as { load?: (file: File) => Promise<Record<string, unknown>> } | undefined;
        const file = typeof File === "undefined" ? undefined : new File([new Uint8Array(bytes)], name);
        if (!file || !ctor?.load) return undefined;
        const doc = await ctor.load(file);
        const text = asText(doc.text) ?? (typeof doc.getText === "function" ? String(doc.getText()) : "");
        return text ? openedFile(name, bytes, "document", { text }) : undefined;
      } catch {
        return undefined;
      }
    });
    return fromLibrary ?? openedFile(name, bytes, "document", { text: rtfText(bytes) });
  },
};

export const odfModule: AdapterModule = {
  id: "odf",
  role: "both",
  extensions: [odt, ods],
  writes: [odt, ods, "html", "md", "typ"],
  async open(bytes, name) {
    const extension = extensionOf(name);
    const specifier = extension === ods ? "odf-kit/ods/to-html" : "odf-kit/odt/to-html";
    const fromLibrary = await tryPackage(specifier, async (mod) => {
      const convert = pickFn(mod, extension === ods ? ["odsToHtml"] : ["odtToHtml"]);
      if (!convert) return undefined;
      const html = asText(await convert(bytes, { fragment: true }));
      return html ? openedFile(name, bytes, "document", { text: html }) : undefined;
    });
    if (fromLibrary) return fromLibrary;
    const text = await zipText(bytes, ["content.xml"]);
    if (!text) throw new FiledomError("unsupported", "OpenDocument has no text");
    return openedFile(name, bytes, "document", { text });
  },
  async write(opened, target) {
    if (target === odt || target === "html" || target === "md" || target === "typ") {
      const specifier =
        target === odt ? "odf-kit/html/to-odt" : target === "md" ? "odf-kit/odt/to-markdown" : target === "typ" ? "odf-kit/odt/to-typst" : "odf-kit/odt/to-html";
      const names = target === odt ? ["htmlToOdt"] : target === "md" ? ["odtToMarkdown"] : target === "typ" ? ["odtToTypst"] : ["odtToHtml"];
      const written = await tryPackage(specifier, async (mod) => {
        const convert = pickFn(mod, names);
        if (!convert) return undefined;
        const input = target === odt ? (opened.text ?? "") : opened.source;
        const result = await convert(input);
        return asBytes(result) ?? (asText(result) ? new TextEncoder().encode(asText(result)) : undefined);
      });
      if (written) return written;
    }
    throw new FiledomError("unsupported", `odf-kit cannot write .${target}`);
  },
};

export const odpOpen: AdapterModule = {
  id: "odp-open",
  role: "open",
  extensions: [odp],
  async open(bytes, name) {
    const fromLibrary = await tryPackage("shrimp-doc-viewer", async (mod) => {
      const text = asText(mod.text) ?? (typeof mod.toText === "function" ? String(await (mod.toText as (b: Uint8Array) => unknown)(bytes)) : "");
      return text ? openedFile(name, bytes, "document", { text }) : undefined;
    });
    if (fromLibrary) return fromLibrary;
    const text = await zipText(bytes, ["content.xml"]);
    if (!text) throw new FiledomError("unsupported", "shrimp-doc-viewer is not loaded");
    return openedFile(name, bytes, "document", { text });
  },
};

export const hwpModule: AdapterModule = {
  id: "hwp",
  role: "both",
  extensions: [hwp, hwpx],
  writes: [hwp, hwpx],
  async open(bytes, name) {
    const fromLibrary = await tryPackage("@rhwp/core", async (mod) => {
      if (typeof mod.default === "function") await (mod.default as () => Promise<unknown>)();
      const Ctor = mod.HwpDocument as (new (data: Uint8Array) => Record<string, unknown>) | undefined;
      if (!Ctor) return undefined;
      const doc = new Ctor(bytes);
      const text = typeof doc.getTextFileText === "function" ? String(doc.getTextFileText()) : "";
      const svg = typeof doc.renderPageSvg === "function" ? String(doc.renderPageSvg(0) ?? "") : "";
      const display = svg.includes("<svg") ? { extension: "svg", bytes: new TextEncoder().encode(svg) } : undefined;
      return openedFile(name, bytes, "document", { text, display });
    });
    if (fromLibrary) return fromLibrary;
    if (extensionOf(name) === hwpx) {
      const text = await zipText(bytes, [".xml"]);
      if (text) return openedFile(name, bytes, "document", { text });
    }
    throw new FiledomError("unsupported", "@rhwp/core is not loaded");
  },
  async write(opened, target) {
    if (target !== hwp && target !== hwpx) throw new FiledomError("unsupported", `hwp cannot write .${target}`);
    try {
      const mod = await loadPackage("@rhwp/core");
      if (typeof mod.default === "function") await (mod.default as () => Promise<unknown>)();
      const Ctor = mod.HwpDocument as (new (data: Uint8Array) => { exportHwp?: () => Uint8Array; exportHwpx?: () => Uint8Array }) | undefined;
      if (!Ctor) throw new FiledomError("unsupported", "@rhwp/core is not loaded");
      const doc = new Ctor(opened.source);
      const bytes = target === hwpx ? doc.exportHwpx?.() : doc.exportHwp?.();
      if (!bytes) throw new FiledomError("unsupported", "@rhwp/core did not write");
      return bytes;
    } catch (error) {
      if (isUnsupported(error)) throw error;
      throw new FiledomError("unsupported", "@rhwp/core is not loaded");
    }
  },
};

export const hwpPdf: AdapterModule = {
  id: "hwp-pdf",
  role: "edit",
  extensions: [hwp, hwpx],
  writes: ["pdf"],
  async write(opened) {
    const written = await tryPackage("rhwptopdf", async (mod) => {
      const convert = pickFn(mod, ["convert", "toPdf", "default"]);
      if (!convert) return undefined;
      return asBytes(await convert(opened.source));
    });
    if (!written) throw new FiledomError("unsupported", "rhwptopdf is not loaded");
    return written;
  },
};

export const iworkOpen: AdapterModule = {
  id: "iwork-open",
  role: "open",
  extensions: [pages, numbers, key],
  async open(bytes, name) {
    const fromLibrary = await tryPackage("@file-viewer/renderer-iwork", async (mod) => {
      const parse = pickFn(mod, ["parseIworkDocument"]);
      if (!parse) return undefined;
      const doc = (await parse(bytes)) as {
        title?: string;
        scenes?: { name?: string; blocks?: { text?: string }[]; tables?: { rows?: string[][] }[]; notes?: string[] }[];
        preview?: { bytes?: Uint8Array; name?: string };
      };
      const text = [
        doc.title ?? "",
        ...(doc.scenes ?? []).flatMap((scene) => [
          scene.name ?? "",
          ...(scene.blocks ?? []).map((block) => block.text ?? ""),
          ...(scene.tables ?? []).flatMap((table) => (table.rows ?? []).map((row) => row.join("\t"))),
          ...(scene.notes ?? []),
        ]),
      ]
        .filter(Boolean)
        .join("\n");
      const preview = doc.preview?.bytes;
      const display =
        preview && preview[0] === 0x89
          ? { extension: "png", bytes: preview }
          : preview && preview[0] === 0xff
            ? { extension: "jpg", bytes: preview }
            : undefined;
      return openedFile(name, bytes, "document", { text, display });
    });
    if (fromLibrary) return fromLibrary;
    const entries = await readZip(bytes);
    const preview = entries
      .filter((entry) => /\.(png|jpe?g)$/i.test(entry.name))
      .sort((a, b) => b.bytes.length - a.bytes.length)[0];
    if (preview?.bytes[0] === 0x89) return openedFile(name, bytes, "document", { display: { extension: "png", bytes: preview.bytes } });
    if (preview?.bytes[0] === 0xff) return openedFile(name, bytes, "document", { display: { extension: "jpg", bytes: preview.bytes } });
    throw new FiledomError("unsupported", "@file-viewer/renderer-iwork is not loaded");
  },
};

export const documentModules = [rtfOpen, odfModule, odpOpen, hwpModule, hwpPdf, iworkOpen];
