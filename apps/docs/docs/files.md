---
sidebar_position: 3
title: Files
---

# Files

`viewer.open(file)` picks an engine from the extension. The same session, the same toolbars, and the same capabilities describe every file. A format that cannot do an action returns `unsupported`. Save writes the format that was opened.

| Kind | Extensions |
| --- | --- |
| FileDOM package | `.filedom` |
| PDF | `.pdf` |
| Word | `.doc`, `.docx`, `.docm`, `.dot`, `.dotx`, `.dotm` |
| Excel | `.xls`, `.xlsx`, `.xlsm`, `.xlt`, `.xltx`, `.xltm`, `.xlsb` |
| PowerPoint | `.ppt`, `.pptx`, `.pptm`, `.pot`, `.potx`, `.pps`, `.ppsx` |
| Image | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tif`, `.tiff` |
| Vector | `.svg`, `.ai` |
| CSV | `.csv` |
| Audio | `.mp3`, `.wav`, `.m4a` |
| Video | `.mp4`, `.mpeg`, `.mpg`, `.webm` |
| Archive | `.zip`, `.gz`, `.tgz`, `.tar`, `.7z` |
| Mail | `.eml`, `.msg` |

The menu bar (File, History, Mode, Find, View, Help) is on every file. The tables below are the toolbars and features that change with the format. [Toolbars](/sdk/docs/toolbars) lists every action.

## Source files

TypeScript, JavaScript, JSON, CSS, HTML, Markdown, Rust, Python, Go, TOML, YAML, and shell open in the code view from `@filedom/core/code`. That module is part of the open-source SDK.

`codeStyle` sets the font and the colors for keywords, strings, numbers, functions, types, and punctuation. `codeFormat` sets the indent, semicolons, quote style, and trailing commas. Pass `style` and `format` to `mountCodeEditor` for one view, or change `codeStyle` and `codeFormat` before mount. A host that does not pass its own values uses those objects.

## FileDOM package

Layout: paged, layered, sheet, canvas, or timeline. The open name ends in `.filedom`.

| Feature | Support |
| --- | --- |
| Every toolbar group | Shown. |
| Each action | Follows the capabilities stored in the package. |
| New text file | A4. Text editing, insert, layers, and track changes. |
| Storage | The features the package allows are stored in the file. |

## PDF

Layout: paged and layered.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the PDF. |
| Font, size, bold, italic, underline, strikethrough, color | Stored in the PDF. |
| Highlight | Stored in the PDF. |
| Comment | Kept for the open session. |
| Move, resize, rotate, delete | Stored in the PDF. Fill and stroke are stored. |
| Layers: show, hide, lock | Stored in the PDF. |
| Track changes: list, Restore, Revert | Stored in the PDF. |
| Find | Search and replace. |
| Align, spacing, indent | Disabled. |
| Insert | Hidden. |

## Word

Layout: paged and layered. A `.doc` saves as `.docx`.

| Feature | Support |
| --- | --- |
| Text editing, including across paragraphs | Stored in the document. |
| Highlight | Stored in the document. |
| Comment | Kept for the open session. |
| Insert image, text box, shape | Stored in the document. |
| Layers: show, hide, lock | Stored in the document. |
| Track changes | Stored in the document. |
| Find | Search and replace. |
| Character style | Disabled. |
| Align, spacing, indent | Disabled. |
| Move page objects | Hidden. |

## Excel

Layout: paged and layered.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the workbook. |
| Highlight | Stored in the workbook. |
| Layers | Stored in the workbook. |
| Track changes | Stored in the workbook. |
| Find | Search and replace. |
| Insert | Hidden. |
| Character style, align, spacing, indent | Disabled. |

## PowerPoint

Layout: paged and layered.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the presentation. |
| Highlight | Stored in the presentation. |
| Layers | Stored in the presentation. |
| Track changes | Stored in the presentation. |
| Find | Search and replace. |
| Insert | Hidden. |
| Character style, align, spacing, indent | Disabled. |

## CSV

Layout: sheet.

| Feature | Support |
| --- | --- |
| Sheet | Copy the sheet. The file is the CSV. |
| Find | Search. |
| Text, layers, track changes, insert, timeline | Hidden. |

## Images

PNG, JPEG, GIF, WebP, BMP, and TIFF. Layout: canvas.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the image. Character style stays disabled. |
| Insert text box or shape | Stored in the image. |
| Move, resize, delete | Stored in the image. Fill and stroke stay hidden. |
| Find | Search and replace. |
| Layers, track changes, highlight | Unsupported. |

## SVG

Layout: layered vector.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the SVG. |
| Font, size, bold, italic, underline, strikethrough, color | Stored in the SVG. |
| Insert text box or shape | Stored in the SVG. |
| Fill, stroke, move, resize, delete | Stored in the SVG. |
| Find | Search and replace. |
| Layers, track changes, highlight | Unsupported. |
| Align, spacing, indent | Disabled. |

## Adobe Illustrator

Layout: vector.

| Feature | Support |
| --- | --- |
| Text editing | Stored in the file. Character style stays disabled. |
| Move, resize, delete | Stored in the file. |
| Find | Search and replace. |
| Insert, layers, color, track changes | Hidden or unsupported. |

## WAV

Layout: timeline.

| Feature | Support |
| --- | --- |
| Play, Pause, Mute | Playback. Not written into the file. |
| Trim, speed, add clip | Written into the WAV. |
| Text, layers, track changes | Unsupported. |

## MP3 and M4A

Layout: timeline.

| Feature | Support |
| --- | --- |
| Play, Pause, Mute | Playback. |
| Trim, speed, add clip | Playback only. Export refuses to write them. Store a `.filedom` package to keep the edit. |
| Text, layers, track changes | Unsupported. |

## Video

MP4, MPEG, and WebM. Layout: timeline.

| Feature | Support |
| --- | --- |
| Play, Pause, Mute | Playback. |
| Trim, speed, add clip | Playback only. Export refuses to write them. Store a `.filedom` package to keep the edit. |
| Text, layers, track changes | Unsupported. |

## Archives

Zip, gzip, tar, and 7z. Layout: a listing.

| Feature | Support |
| --- | --- |
| Archive | Copy the listing. |
| Text, layers, track changes, insert, timeline | Hidden. |

## Email

`.eml` and `.msg`. Layout: a message.

| Feature | Support |
| --- | --- |
| Message | Copy the message. |
| Text, layers, track changes, insert, timeline | Hidden. |
