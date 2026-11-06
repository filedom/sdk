# Extension reach

The chosen set is the one in `website/lib/file-catalog.ts` and `wasm/docs/formats.md`. The site lists it by category. A module is in that set when its license is MIT, BSD, Apache-2.0, ISC, or MPL-2.0, and the file fetched for one suffix stays under 20 MB. The SDK is the only FileDOM source that is public. MPL-2.0 qualifies because the module ships unmodified and its source stays upstream. LGPL, GPL, AGPL, CDDL, and the UnRAR terms stay out. LibreOffice compiled to wasm is the office-to-PDF writer, and both published builds are over 20 MB, so that conversion stays out.

The notes below are the survey that led to that set.

File-Extensions.org lists **34,382** extensions in 41 categories (checked November 2026). Categories overlap, so the category sizes cannot be added. An extension is a suffix a program once chose. It is not a format a person still sends.

FileDOM opens a file from its suffix. This note counts the suffixes the engines already open, then the document and media suffixes that still have a maintained library. The result is one number: **132** document and media extensions make sense for FileDOM to possibly handle. **57** of those are open today. **75** more have a Rust library, or a C library of the same kind already vendored for PDF.

Source files are separate. The site opens **139** source suffixes as text, with no format library. Those 139 are already handled and are not part of the 126.

## Handled now

The engine map is `sdk/packages/core/src/formats.ts`. It names **57** document and media suffixes. The public file table is a shorter label list of the same families.

| Family | Suffixes | Count | Library |
| --- | ---: | ---: | --- |
| Word, Excel, PowerPoint | `.doc` `.dot` `.docx` `.docm` `.dotx` `.dotm` `.xls` `.xlt` `.xla` `.xlsx` `.xlsm` `.xltx` `.xltm` `.xlam` `.xlsb` `.ppt` `.pot` `.pps` `.pptx` `.pptm` `.potx` `.potm` `.ppsx` `.ppsm` | 24 | `office_oxide` 0.1.15. Edits go through `filedom-xlsx` and `filedom-pptx`. The package itself is a zip. |
| PDF | `.pdf` | 1 | `pdfium-render` 0.9.4. PDFium is C++ compiled into the wasm bundle. |
| CSV | `.csv` | 1 | `filedom-csv`, a reader in the crate. |
| Raster | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.tif` `.tiff` | 8 | `image` 0.25.6, with only those features turned on. |
| Vector | `.svg` `.ai` | 2 | `filedom-graphic`, its own SVG session. `resvg` is not a dependency. |
| Audio and video | `.mp3` `.mpga` `.wav` `.m4a` `.mp4` `.m4v` `.mpg4` `.mp4v` `.mpeg` `.mpg` `.mpe` `.m1v` `.m2v` `.webm` | 14 | `filedom-media` recognizes the file. The browser plays it. No Rust decoder is linked. |
| Zip | `.zip` | 1 | `zip` 3. |
| Gzip | `.gz` `.tgz` | 2 | `flate2`. |
| Tar | `.tar` | 1 | `tar` 0.4. |
| 7-Zip | `.7z` | 1 | `sevenz-rust` 0.6. |
| Mail | `.eml` | 1 | An RFC 822 parser in `filedom-media`. |
| Outlook | `.msg` | 1 | `cfb` 0.7, the compound-file reader. |
| **Document and media** | | **57** | |

`.filedom` is the FileDOM package. It is a product file, not one of the 34,382 foreign suffixes.

Source suffixes (139) open in the code view from `@filedom/core/code`. The list lives in `website/lib/formats.ts` as `CODE_FILES`. They are text. Adding another programming-language suffix does not need a decoder.

Together, FileDOM opens **196** suffixes out of the 34,382 directory: 57 document and media, plus 139 source. That is about 0.6% of the directory, which is the right scale. The directory is mostly private application files.

## Document and media worth adding

These 75 suffixes are files a person still exchanges, and a maintained library can read them. Each row names the library and whether it is Rust.

### Pictures — 49

`image` 0.25 is already a dependency. These 13 features are not turned on. PNM covers the four Netpbm suffixes, including `.pam`.

| Suffixes | Count | Library |
| --- | ---: | --- |
| `.ico` `.tga` `.pbm` `.pgm` `.ppm` `.pnm` `.pam` `.hdr` `.qoi` `.dds` `.exr` `.ff` | 12 | `image` 0.25, pure Rust. |
| `.avif` | 1 | `image` 0.25 feature `avif-native`. The decoder is dav1d, which is C, the same arrangement as PDFium. |

`image-extras` adds formats to the same `image` API. Five of them are still used:

| Suffixes | Count | Library |
| --- | ---: | --- |
| `.pcx` `.xbm` `.xpm` `.icns` `.ora` | 5 | `image-extras`, pure Rust. |

| Suffix | Library | Notes |
| --- | --- | --- |
| `.jxl` | `jxl-oxide` | Pure Rust JPEG XL decoder. |
| `.psd` | `rawpsd` or the `psd` crate | 8-bit RGB, CMYK, and gray. Photoshop Big (`.psb`) is outside this. |
| `.3fr` `.ari` `.arw` `.cr2` `.cr3` `.crm` `.crw` `.dcr` `.dcs` `.dng` `.erf` `.fff` `.iiq` `.kdc` `.mef` `.mos` `.mrw` `.nef` `.nrw` `.orf` `.ori` `.pef` `.qtk` `.raf` `.raw` `.rw2` `.rwl` `.srw` `.x3f` | `rawler` (dnglab) | 29 suffixes, from `supported_extensions()`. The catalog’s RAW heading lists 83 suffixes. `.raw` is one of the 29 and is also used by unrelated programs. |

### Documents and books — 13

| Suffixes | Count | Library |
| --- | ---: | --- |
| `.rtf` | 1 | `rtf-parser`, pure Rust. |
| `.odt` `.ott` `.ods` `.ots` `.odp` `.otp` | 6 | OpenDocument is a zip of XML. `calamine` reads `.ods`. Writer and Impress need `zip` plus an XML reader such as `roxmltree`. There is no `office_oxide` equivalent for Writer. |
| `.epub` | 1 | A zip of XHTML. `zip` is already in the tree. |
| `.fb2` | 1 | FictionBook is XML. |
| `.mobi` `.azw` `.azw3` | 3 | The `mobi` crate, pure Rust. Many Kindle files are locked with DRM and stay unreadable. |
| `.cbz` | 1 | A zip of images. `zip` and `image` are already in the tree. |

### Recordings — 12

| Suffixes | Count | Library |
| --- | ---: | --- |
| `.flac` `.ogg` `.oga` `.aac` `.aiff` `.aif` `.aifc` `.caf` `.mp1` `.mp2` `.m4b` | 11 | `symphonia` 0.6.1, pure Rust. Demuxers: AIFF, CAF, ISO MP4, Matroska and WebM, Ogg, WAV. Codecs: AAC-LC, ADPCM, ALAC, FLAC, MP1, MP2, MP3, PCM, Vorbis. `.m4b` is an AAC audiobook in the MP4 family already recognized for `.m4a`. |
| `.mov` | 1 | QuickTime is the same MPEG-4 family the browser already plays for `.mp4`. |

### Mail — 1

| Suffix | Library |
| --- | --- |
| `.mbox` | A mailbox is concatenated RFC 822 messages. The `.eml` parser already covers one message. `mailparse` is the pure Rust reader for a whole mailbox. |

### The number

| Group | Extensions |
| --- | ---: |
| Document and media open today | 57 |
| Pictures worth adding | 49 |
| Documents and books worth adding | 13 |
| Recordings worth adding | 12 |
| Mail worth adding | 1 |
| **Document and media FileDOM makes sense to possibly handle** | **132** |

That ceiling is a counted list. It is not a promise to open 132 formats, and it is not a share of 34,382. A format that cannot do an action still returns `unsupported`.

## Loaded separately

FileDOM already downloads one wasm bundle when that format is opened (`sdk/packages/core/src/bundles.ts`). A C or C++ engine can sit in the same slot and stay off the wire until a file needs it. These are the ones that add suffixes the Rust list does not already name. None of them reads the rest of the 34,382.

| Module | Loaded when | Suffixes it adds | Count | License and size |
| --- | --- | --- | ---: | --- |
| ffmpeg.wasm | A recording the browser cannot play | `.avi` `.mkv` `.wmv` `.flv` `.ogv` `.3gp` `.ts` `.opus` `.wma` `.ape` | 10 | The usual build is GPL, because of the codecs. The wasm file is tens of megabytes. |
| `libheif-js` | A phone photo | `.heic` `.heif` | 2 | C++. HEVC inside HEIC is patent-encumbered. The wasm build is loaded on its own. |
| MuPDF.js | A fixed-page document or a JPEG 2000 picture | `.xps` `.oxps` `.jp2` `.j2k` | 4 | AGPL, or a commercial Artifex license. The wasm binary is about 10 MB. EPUB, FictionBook, and CBZ are in this engine too, and they are already in the 132. |
| SheetJS community | A spreadsheet that is not Excel | `.fods` `.dbf` `.slk` `.dif` | 4 | Apache-2.0. Plain JavaScript, imported when one of these opens. ODS is already in the 132. |
| libarchive.js | A compressed package | `.rar` `.cbr` `.bz2` `.xz` | 4 | BSD. Its own RAR reader, so the UnRAR license does not apply. These four are packages, not pages. |

ZetaOffice is LibreOffice compiled to one wasm blob, about 34 MB plus about 15 MB of data, fetched from its CDN when an office file opens. It reads and writes DOCX, ODT, ODS, XLSX, and PPTX in the 2025 browser build. Those suffixes are already in the 132. It does not raise the suffix count. It is the office-to-PDF writer, and it is a commercial build.

| Group | Extensions |
| --- | ---: |
| Document and media with a Rust path | 132 |
| Added by a separate wasm or JavaScript module | 20 |
| **Document and media if those modules are allowed** | **152** |
| Archive packages from libarchive.js, beside that | 4 |

152 is still a counted list. A private save file, a game, a disk image, and an executable stay unrecognized. DjVu, Outlook `.pst`, Photoshop Big, and PostScript have C libraries and no maintained wasm package ready to fetch, so they stay out of the 152.

## Conversions

Save writes the format that was opened. One path changes the suffix.

| From | To | What is written |
| --- | --- | --- |
| `.doc` | `.docx` | A new Office Open XML package. This is the only cross-format write. |
| `.docx` | `.docx` | The package, regenerated when the text changed. |
| `.xlsx` | `.xlsx` | The workbook package. |
| `.pptx` | `.pptx` | The presentation package. |
| `.xls` | `.xls` | The same compound file. |
| `.ppt` | `.ppt` | The same compound file. |
| `.pdf` | `.pdf` | The same PDF, with an edit ledger appended when the file changed. |
| `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.tif` `.tiff` | the same suffix | The pixels, encoded again in the format that was opened. |
| `.svg` `.ai` | the same suffix | The drawing, written again. |
| `.wav` | `.wav` | The timeline, baked into a WAV. |
| `.mp3` `.m4a` `.mp4` `.webm` `.mpeg` | the same bytes | Untouched bytes. A timeline edit returns `unsupported`. |
| `.csv` `.eml` `.msg` `.zip` `.gz` `.tar` `.7z` | the same bytes | The bytes from open. |
| a source file | the same name | The text. |
| `.filedom` | `.filedom` | The package. |

These conversions are not implemented. `export_pdf` returns `unsupported`, including PDF/A-2 and PDF/UA.

| From | To | What would do it |
| --- | --- | --- |
| `.docx` `.odt` `.ods` `.xlsx` `.pptx` | `.pdf` | ZetaOffice. The in-tree PDF helper writes one page of plain text and is not wired to a session. |
| `.heic` `.heif` | `.png` or `.jpeg` | `libheif-js`, then the `image` encoder. |
| `.avi` `.mkv` `.wmv` `.flv` `.ogv` `.3gp` `.ts` `.opus` `.wma` `.ape` | `.mp4` `.webm` `.mp3` `.wav` | ffmpeg.wasm. |
| `.pdf` `.xps` `.epub` | `.png` or `.jpeg` | MuPDF.js renders a page. |
| `.xls` `.xlsx` `.ods` `.csv` `.dbf` `.slk` `.dif` | each other | SheetJS, for the cell values. Formulas and layout do not survive. |
| `.png` `.jpeg` `.gif` `.webp` `.bmp` `.tiff` | each other | The `image` crate already in the graphic engine. Export currently encodes the opened format only. |

## Does not make sense

Everything in the 34,382 directory outside the 152 document and media suffixes, the 4 archive packages, and the 139 source suffixes already shown as text, is in this group. The reasons are the kind of file, not a missing week of work.

### A private file of one program

Most of the directory is a save format, a cache, or a project file for a single application. The largest headings on File-Extensions.org are this kind of file: various data (11,717), games (2,822), settings and themes (1,996), source (1,971), 3D and CAD (1,277), miscellaneous graphics (1,152), and archives (1,269). The document heading (1,767), the audio heading (1,333), the bitmap heading (1,086), and the video heading (709) are the same shape once the 152 are removed: one suffix per retired word processor, tracker, paint program, or camera dump.

No maintained decoder exists for these, in Rust or otherwise. A converter would be a rewrite of a dead application. FileDOM should leave them unrecognized.

The source heading is the exception inside this bucket. A further source suffix is text. It can join the code view without a library. It is not a document or a recording, so it stays out of the 132.

### A copy, a wrapper, or an installer

Backup (700), temporary (393), and a large part of the archive heading are copies and installers: `.bak`, `.tmp`, `.part`, `.cab` installers, disk images (214). The bytes belong to another format, or they are an operating-system image. Opening the wrapper does not produce a page.

`.bz2`, `.xz`, and `.zst` do have Rust crates (`bzip2`, `lzma-rs` or `xz2`, `zstd`). They are compression around some other file. They are left out of the 132 because they are not a document or a recording.

### A program, a database, or a map

Executables and libraries (178), system files (481), plugins (393), databases (540), accounting files (411), configuration (416), GIS (499), and emulator images (272) are not pages or recordings. Rendering one of them would mean embedding that application.

### Hostile or locked

The dangerous and ransomware headings are suffixes malware uses. Encoded and encrypted files (484) cannot be shown without the key. Email-blocked attachments (95) are the same files under a renamed suffix. DRM Kindle files fail in the `mobi` crate for the same reason: the bytes are locked. Unknown (399) has no agreed format.

### Researched, and still the wrong fit

These have a library. They still do not belong in a per-format wasm bundle.

| Family | Why it stays out | Library that exists |
| --- | --- | --- |
| DjVu | The Rust crate is 0.1, and there is no maintained wasm package to fetch. | `djvu` 0.1. A C build of DjVuLibre would have to be compiled first. |
| Outlook stores (`.pst`) | No maintained Rust reader of a full store. | — |
| Photoshop Big (`.psb`) | `rawpsd` stops at 8-bit `.psd`. | — |
| The other RAW suffixes | The catalog lists 83. `rawler` names 29. The rest have no Rust decoder. | `zenraw` wraps `rawler` and does not add suffixes. |
| Apple Pages, Numbers, Keynote | Proprietary packages with no maintained Rust document reader. | — |
| Fonts (204) | A font is an asset inside a document. It is not a file to open as a page. | `ttf-parser` and `ab_glyph` already sit under the PDF and graphic stacks. |
| `document-parser` | A 0.1 alpha wrapper around several of the crates already named above. The underlying crates are the ones to use. | `document-parser` 0.1.0-alpha. |

## Licenses

The third-party libraries linked today are open source under permissive terms: MIT, Apache-2.0, BSD, Zlib, or public domain. The wasm workspace itself is marked `LicenseRef-Proprietary`. The SDK packages are marked MIT.

| Dependency | License | Role |
| --- | --- | --- |
| `office_oxide` | MIT OR Apache-2.0 | Word, Excel, PowerPoint. The name OfficeOxide is a trademark of the author. The code license does not grant the name. |
| `pdfium-render` | MIT OR Apache-2.0 | Rust binding. |
| PDFium | BSD-3-Clause, plus the notices of the libraries it bundles | The PDF engine behind `pdfium_latest`. Those bundled libraries are open source. |
| `image` 0.25.6 | MIT OR Apache-2.0 | Raster codecs that are turned on. `dav1d`, used only if AVIF is turned on, is BSD-2-Clause. AV1's patent license is the royalty-free AOMedia license. |
| `zip`, `flate2`, `tar` | MIT OR Apache-2.0 | Archives. `flate2` is built with the Rust backend. |
| `sevenz-rust` | Apache-2.0 | 7z. |
| `cfb` | MIT | Outlook `.msg`. |
| `fontdue` | MIT OR Apache-2.0 OR Zlib | Outline fonts. It uses `ttf-parser`. |
| `font8x8` | MIT, font data public domain | Bitmap glyphs and the small OCR matcher. |
| `serde`, `serde_json`, `wasm-bindgen`, `js-sys` | MIT OR Apache-2.0 | Glue. |

`rawler` is LGPL-2.1. It is open source, and it is copyleft. The 29 RAW suffixes in the Rust list come with that obligation. `symphonia` is MPL-2.0: open source, and the MPL files stay under the MPL.

These are open source and carry a stronger term, or a patent, or both.

| Library | License | Finding |
| --- | --- | --- |
| ffmpeg | LGPL-2.1 or later by default. GPL when x264 or x265 is linked. | The common wasm build is GPL. An LGPL build can demux the extra containers and leave H.264 encoding to Cisco's OpenH264 binary, which is BSD plus Cisco's MPEG-LA grant. |
| `libheif`, and `libde265` | LGPL-3.0 | Open source. HEVC patents are a separate grant the license does not give. `heic2any` is an MIT wrapper around that LGPL wasm. |
| MuPDF, Ghostscript | AGPL-3.0, or a commercial Artifex license | Open source. The AGPL reaches a modified copy offered over a network. |
| OnlyOffice Document Server | AGPL-3.0 | An office editor and converter. Community use is AGPL. Branding has extra terms. A commercial license is separate. |
| LibreOffice, Collabora Online | MPL-2.0 | The open-source office engine. ZetaOffice is a commercial wasm packaging of that engine, not a second code license. |
| libarchive | BSD-2-Clause | Permissive. Its RAR reader is its own code. The UnRAR sources are not open source. |
| SheetJS Community Edition | Apache-2.0 | Open source. SheetJS Pro is not. Current CE builds are published from sheetjs.com, not as the old `xlsx` package on the public npm registry. |
| `exceljs` | MIT | Reads and writes `.xlsx` only. |
| `mammoth` | BSD-2-Clause | Converts `.docx` to HTML. It does not write a Word file back. |
| pdf.js | Apache-2.0 | PDF viewer. FileDOM already renders PDF with PDFium. |
| `pdf-lib` | MIT | Creates and edits PDF files. Narrower than PDFium. |
| qpdf | Apache-2.0 | PDF structure, encryption, and split. Wasm builds exist. |
| Tesseract and tesseract.js | Apache-2.0 | OCR. It does not add a suffix. |
| Pandoc | GPL-2.0 or later | Converts markup, docx, odt, epub, and HTML. A command-line tool, not a browser module. |
| Calibre | GPL-3.0 | Converts epub, mobi, azw3, fb2, pdf, and cbz. A desktop and server tool. |
| Document Liberation (`libwpd`, `libwps`, `libmwaw`, `libetonyek`, `libmspub`, `libvisio`, `libcdr`, and the rest) | LGPL-2.1 or MPL-2.0, depending on the library | Readers for WordPerfect, Works, old Mac writers, older iWork, Publisher, Visio, and CorelDRAW. They emit a document stream. No wasm package is published. |
| `libpff` | LGPL-3.0 | Reads Outlook `.pst`. |
| DjVuLibre | GPL-2.0 | Reads DjVu. |
| LibRaw | LGPL-2.1 OR CDDL-1.0 | More cameras than `rawler`. |
| libvips | LGPL-2.1 | Image opener. wasm-vips exists. Each delegate (HEIF, JPEG 2000, PDF) brings its own license. |
| `resvg` | MPL-2.0 | SVG renderer. FileDOM's SVG session does not use it. |
| OpenH264 | BSD-2-Clause | H.264 codec. Cisco distributes a binary under a patent grant. |
| `ag-psd` | MIT | Reads and writes layered PSD in JavaScript. Broader than `rawpsd`. |

Gotenberg is MIT and shells out to LibreOffice. It is a server, not a library to ship in the browser.

## Sources

- File-Extensions.org file-type index, 34,382 extensions, 41 categories: https://www.file-extensions.org/file-types
- `image` 0.25 supported formats, including the dav1d AVIF feature: https://docs.rs/image/0.25.6/image/
- `rawler` `supported_extensions()`: ARI, ARW, CR2, CR3, CRM, CRW, DCR, DCS, DNG, ERF, IIQ, KDC, MEF, MOS, MRW, NEF, NRW, ORF, ORI, PEF, RAF, RAW, RW2, RWL, SRW, 3FR, FFF, X3F, QTK. Source: https://docs.rs/rawler/latest/src/rawler/decoders/mod.rs.html
- `symphonia` 0.6.1 features: https://docs.rs/crate/symphonia/0.6.1
- Engine map: `sdk/packages/core/src/formats.ts`. Crate dependencies: `wasm/crates/open`, `wasm/crates/graphic`, `wasm/crates/media`, `wasm/crates/csv`.
- Save path: `wasm/crates/open/src/flow.rs` writes `.doc` as `.docx`. `export_pdf` in `wasm/crates/core/src/session.rs` returns `unsupported`.
- ffmpeg.wasm, `libheif-js`, libarchive.js, MuPDF.js (`mupdf` on npm, AGPL), SheetJS community, ZetaOffice (LibreOffice wasm, about 34 MB plus 15 MB of data).
