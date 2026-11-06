import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { xmlText } from "../codecs.js";
import { tryPackage } from "../load.js";
import { openedFile } from "../session.js";
import { BOOK_ADAPTERS } from "../suffixes.js";
import { asBytes, extensionOf, pixelsFrom } from "../variation.js";
import { readZip } from "../zip-bytes.js";

const [epub, mobi, azw3, fb2, cbz, djvu, djv] = BOOK_ADAPTERS;

function bookText(entries: { name: string; bytes: Uint8Array }[]): string {
  return entries
    .filter((entry) => /\.(xhtml|html|htm|xml|opf|ncx)$/i.test(entry.name))
    .map((entry) => xmlText(entry.bytes))
    .filter(Boolean)
    .join("\n\n");
}

export const booksOpen: AdapterModule = {
  id: "books-open",
  role: "open",
  extensions: [epub, mobi, azw3, fb2, cbz],
  async open(bytes, name) {
    const extension = extensionOf(name);
    const fromLibrary = await tryPackage("foliate-js", async (mod) => {
      const key = extension === epub ? "EPUB" : extension === fb2 ? "FB2" : extension === cbz ? "ComicBook" : "MOBI";
      const Ctor = mod[key] as (new (file: File) => { init?: () => Promise<void>; text?: string }) | undefined;
      if (!Ctor || typeof File === "undefined") return undefined;
      const book = new Ctor(new File([new Uint8Array(bytes)], name));
      await book.init?.();
      return book.text ? openedFile(name, bytes, "book", { text: book.text }) : undefined;
    });
    if (fromLibrary) return fromLibrary;
    if (extension === mobi || extension === azw3) throw new FiledomError("unsupported", "foliate-js is not loaded");
    if (extension === fb2) {
      const text = xmlText(bytes);
      if (!text) throw new FiledomError("unsupported", "FictionBook has no text");
      return openedFile(name, bytes, "book", { text });
    }
    const entries = await readZip(bytes);
    if (extension === cbz) {
      const images = entries.filter((entry) => /\.(png|jpe?g|gif|webp)$/i.test(entry.name));
      if (images.length === 0) throw new FiledomError("unsupported", "comic book has no images");
      return openedFile(name, bytes, "book", { entries: images });
    }
    const text = bookText(entries);
    if (!text) throw new FiledomError("unsupported", "EPUB has no text");
    return openedFile(name, bytes, "book", { text });
  },
};

export const djvuOpen: AdapterModule = {
  id: "djvu-open",
  role: "open",
  extensions: [djvu, djv],
  async open(bytes, name) {
    const image = await tryPackage("djvu-rs", async (mod) => {
      if (typeof mod.default === "function") await (mod.default as () => Promise<unknown>)();
      const Doc = mod.WasmDocument as { from_bytes?: (data: Uint8Array) => { page: (index: number) => { render: (dpi: number) => Uint8ClampedArray; width_at: (dpi: number) => number; height_at: (dpi: number) => number }; page_count: () => number } } | undefined;
      const doc = Doc?.from_bytes?.(bytes);
      if (!doc) return undefined;
      const page = doc.page(0);
      const pixels = page.render(72);
      return openedFile(name, bytes, "book", {
        text: `${doc.page_count()} pages`,
        image: { width: page.width_at(72), height: page.height_at(72), pixels },
      });
    });
    if (!image) throw new FiledomError("unsupported", "djvu-rs is not loaded");
    return image;
  },
};

export const djvuEdit: AdapterModule = {
  id: "djvu-edit",
  role: "edit",
  extensions: [djvu, djv],
  writes: ["pdf", "png", "tiff", "epub", "cbz"],
  async write(opened, target) {
    const written = await tryPackage("djvu-rs", async (mod) => {
      const name = `to_${target}` in mod ? `to_${target}` : target === "pdf" ? "to_pdf" : "";
      const convert = name ? (mod[name] as ((bytes: Uint8Array) => Uint8Array) | undefined) : undefined;
      const bytes = convert?.(opened.source);
      return asBytes(bytes) ?? pixelsFrom(bytes)?.pixels;
    });
    if (written instanceof Uint8Array) return written;
    throw new FiledomError("unsupported", "djvu-rs build renders pages. A writer build is not loaded.");
  },
};

export const bookModules = [booksOpen, djvuOpen, djvuEdit];
