import { FiledomError } from "../../errors.js";
import type { AdapterModule, OpenedAdapterFile } from "../api.js";
import { tryPackage } from "../load.js";
import { asBytes, asText } from "../variation.js";

function textBytes(value: unknown): Uint8Array | undefined {
  const bytes = asBytes(value);
  if (bytes) return bytes;
  const text = asText(value);
  return text ? new TextEncoder().encode(text) : undefined;
}

function outcomeBytes(value: unknown): Uint8Array | undefined {
  if (value && typeof value === "object" && "output" in value) {
    const outcome = value as { output?: unknown; error?: unknown };
    if (outcome.error) return undefined;
    return textBytes(outcome.output);
  }
  return textBytes(value);
}

export const svgPdf: AdapterModule = {
  id: "svg-pdf",
  role: "edit",
  extensions: ["svg"],
  writes: ["pdf"],
  async write(opened) {
    const written = await tryPackage("svg2pdf.js", async (mod) => {
      const svg2pdf = (mod.svg2pdf ?? mod.default) as ((svg: Element, doc: { output: (kind: string) => ArrayBuffer }, options: object) => Promise<void>) | undefined;
      const jsPDF = (await tryPackage("jspdf", async (pdf) => pdf.jsPDF ?? pdf.default)) as (new () => { output: (kind: string) => ArrayBuffer }) | undefined;
      if (!svg2pdf || !jsPDF || typeof DOMParser === "undefined") return undefined;
      const text = new TextDecoder().decode(opened.source);
      const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
      const doc = new jsPDF();
      await svg2pdf(svg, doc, { x: 0, y: 0, width: 210, height: 297 });
      return new Uint8Array(doc.output("arraybuffer"));
    });
    if (!written) throw new FiledomError("unsupported", "svg2pdf.js is not loaded");
    return written;
  },
};

export const epubWrite: AdapterModule = {
  id: "epub-write",
  role: "edit",
  extensions: ["html", "htm", "md", "txt"],
  writes: ["epub"],
  async write(opened) {
    const written = await tryPackage("epub-gen-memory", async (mod) => {
      const epub = mod.default as ((options: { title: string }, content: { title: string; content: string }[]) => Promise<unknown>) | undefined;
      if (typeof epub !== "function") return undefined;
      const content = opened.text ?? new TextDecoder().decode(opened.source);
      return textBytes(await epub({ title: opened.name }, [{ title: opened.name, content }]));
    });
    if (!written) throw new FiledomError("unsupported", "epub-gen-memory is not loaded");
    return written;
  },
};

export const docmuxModule: AdapterModule = {
  id: "docmux",
  role: "edit",
  extensions: ["md", "html", "htm", "tex", "typ", "docx", "txt"],
  writes: ["md", "html", "tex", "typ", "docx", "txt"],
  async write(opened, target) {
    const from = opened.extension === "htm" ? "html" : opened.extension === "txt" ? "plaintext" : opened.extension === "tex" ? "latex" : opened.extension;
    const to = target === "txt" ? "plaintext" : target === "tex" ? "latex" : target;
    const written = await tryPackage("@docmux/wasm", async (mod) => {
      const input = new TextDecoder().decode(opened.source);
      if (target === "docx" && typeof mod.convertToBytes === "function") {
        return asBytes(await (mod.convertToBytes as (input: string, from: string, to: string, resources: Map<string, Uint8Array>) => Promise<unknown>)(input, from, to, new Map()));
      }
      const convert = (mod.convert ?? mod.convertStandalone) as ((input: string, from: string, to: string) => Promise<unknown>) | undefined;
      if (typeof convert !== "function") return undefined;
      return outcomeBytes(await convert(input, from, to));
    });
    if (!written) throw new FiledomError("unsupported", "@docmux/wasm is not loaded");
    return written;
  },
};

export const anydocModule: AdapterModule = {
  id: "anydoc",
  role: "edit",
  extensions: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "epub", "pdf"],
  writes: ["md"],
  async write(opened) {
    const written = await tryPackage("@firecrawl/anydoc-wasm", async (mod) => {
      if (typeof mod.default === "function") await (mod.default as () => Promise<unknown>)();
      const convert = mod.toMarkdownBytes as ((bytes: Uint8Array, format?: string) => unknown) | undefined;
      if (typeof convert !== "function") return undefined;
      const known = new Set(["doc", "docx", "odt", "pdf", "ppt", "pptx", "rtf", "epub", "xlsx", "ods", "odp", "csv"]);
      return textBytes(convert(opened.source, known.has(opened.extension) ? opened.extension : undefined));
    });
    if (!written) throw new FiledomError("unsupported", "@firecrawl/anydoc-wasm is not loaded");
    return written;
  },
};

export function sourceFile(bytes: Uint8Array, name: string): OpenedAdapterFile {
  return {
    name,
    extension: name.split(".").pop()?.toLowerCase() ?? "",
    kind: "document",
    source: bytes,
    text: new TextDecoder().decode(bytes),
  };
}

export const convertModules = [svgPdf, epubWrite, docmuxModule, anydocModule];
