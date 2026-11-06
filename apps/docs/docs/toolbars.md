---
sidebar_position: 5
title: Toolbars
description: File, Edit, Insert, View, and Help sit on every file. A second toolbar follows the selection, layers, track changes, or timeline.
---

# Toolbars

The menu bar is on every file: File, Edit, Insert, View, and Help. Open files are tabs under that bar. A new file opens as the first tab. Drag a tab to reorder it. Insert is added when the file can place an element. A second toolbar appears for the current selection, the layers tray, the track-changes list, or a timeline clip. With nothing selected, only the menu bar is shown.

A group the format cannot support is hidden. A group that applies, but the mode or the selection blocks it, stays visible and disabled. View only disables editing. Play, Pause, Mute, search, and the View menu stay available.

The View menu lists every toolbar. It cannot be hidden. Lock freezes positions. Unlocked, a toolbar can be dragged. Help shows a short description on hover. Settings groups the theme, colors, toolbars, mode, help, and layout in a dialog at the center of the window.

Toolbars are DOM nodes in the chrome. They do not scroll with the page. A host can replace a group through `ComponentRegistry`.

## File

| Action | What it does |
| --- | --- |
| New | Creates a FileDOM package. Text starts on an A4 page. An image starts from a pixel width and height. |
| Open | Opens a file into the session. |
| Save | Writes the format that was opened. |
| Close | Closes the open file. If the file has unsaved changes, the editor asks before discarding them. |
| Store as filedom | Writes this session as a `.filedom` package. |
| Export | Writes another format. Enabled when the open file is a `.filedom` package. |

## History

Undo and Redo. Both are disabled in View only, and when there is nothing to undo or redo.

## Mode

| Mode | Behavior |
| --- | --- |
| Live | Edit without the history list. |
| Track changes | Edit and list each change. The track-changes toolbar adds Restore and Revert. |
| View only | Read the file. Editing controls stay visible and disabled when the format supports them. |

The mode menu is on every file, and in Settings under Editing. Restore and Revert are stored for PDF, Word, Excel, and PowerPoint. Images, SVG, Illustrator, audio, video, archives, and email report track changes as unsupported.

## Find

Search, Previous, Next, Replace with, Replace, and Replace all. Search runs on every file that has text. Replace stays disabled in View only, and when `capabilities.editText` is false.

## View

Zoom out, the percentage, Zoom in, Fit width, and Fit page stay on the window. The percentage opens a field for a zoom from 10% to 500%. Theme, toolbar lock, which toolbars are visible, the editing mode, help descriptions, and the layout are in Settings. FileDOM matches the website. The other palettes are FileDOM Dark, Paper, and Ink. See [Theming](/sdk/docs/theming).

## Help

Shows the hover descriptions. On every file.

## Insert

Image, Text box, Code, and Shape. The menu is hidden unless the file can place an element, and disabled in View only.

| File | What can be inserted |
| --- | --- |
| Word (`.doc`, `.docx`) | Image, text box, code, and shape, placed on the page. Code is full width, with line numbers on the left. |
| PNG, JPEG, GIF, WebP, BMP, TIFF, SVG | Text box and shape, stored in the file. |
| PDF, Excel, PowerPoint, CSV, Illustrator, audio, video, archives, email | Insert is hidden. |

## Text

Shown for a text selection when the file can edit or style text. Hidden with nothing selected. Disabled in View only.

| Action | When it writes into the file |
| --- | --- |
| Font, Size, Bold, Italic, Underline, Strikethrough, Color | Enabled when `capabilities.formatText` is set. Stored in PDF and SVG. Disabled for Word, Excel, PowerPoint, images, and Illustrator. |
| Highlight, Clear highlight | Need a selection. Stored in PDF and Office. Images, SVG, and Illustrator report highlight as unsupported. |
| Align left, Align center, Align right, Justify, Line spacing, Decrease indent, Increase indent | On the toolbar. Disabled. No current format sets `capabilities.formatParagraph`. |
| Comment | Needs a selection. Attaches a note for the open session on PDF and Office. |

## Image

Shown when an image is selected and the file can move page objects (`capabilities.transform`). PDF, images, SVG, and Illustrator.

| Action | What it does |
| --- | --- |
| Replace | Replaces the selected image. |
| Delete | Deletes it. Written into the file. |
| Deselect | Clears the selection. |

## Shape

Shown when a shape is selected and the file can move page objects.

| Action | What it does |
| --- | --- |
| Fill | Shape fill. Shown when `capabilities.formatText` is set: PDF and SVG. |
| Stroke | Shape stroke. Same files as Fill. |
| Delete | Deletes the shape. Written into the file. |
| Deselect | Clears the selection. |

Images and Illustrator can move and delete a shape. Fill and stroke stay hidden.

## Layers

The layers tray sits beside the page outside View only, when the file has layers or page objects. Lock and Hide appear when a layer is selected and `capabilities.layers` is set.

| Action | Where it is stored |
| --- | --- |
| Lock | PDF, Word, Excel, and PowerPoint. |
| Hide | PDF, Word, Excel, and PowerPoint. |
| Delete | Deletes the selected element. |
| Deselect | Clears the selection. |

Images, SVG, and Illustrator do not store layers. The lock and hide controls stay hidden.

## Track changes

A tray, shown in Track mode. Restore returns the document to that change. Revert drops it. Stored for PDF, Word, Excel, and PowerPoint. Other formats report the command as unsupported.

## Audio and video

Play, Pause, and Mute. They stay available in View only. They control playback and are not written into the file.

## Timeline

Trim, Speed, and Add clip. Shown for audio and video outside View only, after a clip is selected. Speed runs from a quarter to four times. An added clip has to be the same format.

| File | Storage |
| --- | --- |
| WAV | Trim, speed, and added clips are written into the WAV. |
| MP3, M4A, MP4, MPEG, WebM | The edited timeline plays. Export refuses to write it back. Store the session as `.filedom` to keep it. |

## Sheet, archive, and message

| Toolbar | File | Action |
| --- | --- | --- |
| Sheet | CSV | Copy the sheet. |
| Archive | zip, gzip, tar, 7z | Copy the listing. |
| Message | `.eml`, `.msg` | Copy the message. |

These files do not show text, layers, track changes, insert, or the timeline.

## The `.filedom` package

A file whose name ends in `.filedom` shows every toolbar group: Insert, Text, Image, Shape, Layers, Track changes, Audio, Video, Timeline, Sheet, Archive, and Message, as well as the menu bar. Each action still follows the capabilities stored in that package. A package saved from a PDF keeps the PDF capabilities. A new text file is an A4 page that can edit text, insert, use layers, and track changes.
