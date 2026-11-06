import type { AdapterImage, AdapterModule } from "../api.js";
import { decodeRaster, encodeRaster } from "../codecs.js";
import { openedFile } from "../session.js";
import { RASTER_ADAPTERS } from "../suffixes.js";
import { extensionOf } from "../variation.js";

function imageOf(value: AdapterImage | { display: Uint8Array; extension: string }): Pick<AdapterImage, never> & {
  image?: AdapterImage;
  display?: { extension: string; bytes: Uint8Array };
} {
  if ("pixels" in value) return { image: value };
  return { display: { extension: value.extension, bytes: value.display } };
}

export const rasterModule: AdapterModule = {
  id: "raster",
  role: "both",
  extensions: RASTER_ADAPTERS,
  writes: ["ff", "qoi", "pbm", "pgm", "ppm", "pnm", "pam"],
  async open(bytes, name) {
    const decoded = decodeRaster(extensionOf(name), bytes);
    return openedFile(name, bytes, "image", imageOf(decoded));
  },
  async write(opened, target) {
    if (!opened.image) throw new Error("unsupported: raster has no pixels");
    return encodeRaster(target, opened.image);
  },
};

export const rasterModules = [rasterModule];
