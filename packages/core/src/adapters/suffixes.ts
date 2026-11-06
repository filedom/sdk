/** Suffixes the engine does not know. Each one lazy-loads the module that lists it. */

export const DOCUMENT_ADAPTERS = ["rtf", "odt", "ods", "odp", "hwp", "hwpx", "pages", "numbers", "key"] as const;
export const BOOK_ADAPTERS = ["epub", "mobi", "azw3", "fb2", "cbz", "djvu", "djv"] as const;
export const RASTER_ADAPTERS = ["ico", "tga", "pbm", "pgm", "ppm", "pnm", "pam", "hdr", "qoi", "dds", "ff"] as const;
export const EXR_ADAPTERS = ["exr"] as const;
export const AVIF_ADAPTERS = ["avif"] as const;
export const JXL_ADAPTERS = ["jxl"] as const;
export const JPEG2000_ADAPTERS = ["jp2", "j2k", "j2c"] as const;
export const PSD_ADAPTERS = ["psd", "psb"] as const;
export const PCM_ADAPTERS = ["flac", "opus", "ogg", "oga", "wv", "mpc"] as const;
export const PCM_CONTAINER_ADAPTERS = ["aiff", "aif", "aifc", "caf"] as const;
export const MPEG_AUDIO_ADAPTERS = ["mp1", "mp2"] as const;
export const CONTAINER_ADAPTERS = ["mkv", "mov"] as const;
export const ARCHIVE_ADAPTERS = ["bz2", "xz", "zst"] as const;
export const MAIL_ADAPTERS = ["mbox"] as const;

export const ADAPTER_SUFFIXES = [
  ...DOCUMENT_ADAPTERS,
  ...BOOK_ADAPTERS,
  ...RASTER_ADAPTERS,
  ...EXR_ADAPTERS,
  ...AVIF_ADAPTERS,
  ...JXL_ADAPTERS,
  ...JPEG2000_ADAPTERS,
  ...PSD_ADAPTERS,
  ...PCM_ADAPTERS,
  ...PCM_CONTAINER_ADAPTERS,
  ...MPEG_AUDIO_ADAPTERS,
  ...CONTAINER_ADAPTERS,
  ...ARCHIVE_ADAPTERS,
  ...MAIL_ADAPTERS,
] as const;

/** Documented in wasm and not loaded. */
export const LICENSE_EXCLUDED_SUFFIXES = [
  "heic",
  "heif",
  "arw",
  "cr2",
  "cr3",
  "dng",
  "nef",
  "raf",
  "raw",
  "rw2",
  "rar",
  "cbr",
  "avi",
  "wmv",
  "flv",
  "wma",
  "ape",
  "xps",
  "oxps",
  "ps",
  "eps",
  "wpd",
  "pst",
] as const;
