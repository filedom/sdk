---
sidebar_position: 3
title: Files
---

# Files

| Action | Call |
| --- | --- |
| New | `createDocument` with kind `text` or `image`, then A4 (text) or pixel width and height (image). Writes `.domdoc`. |
| Open | `viewer.open(source)` |
| Save | writes the format that was opened |
| Store as domdoc | `storeDomdoc` on a native session; keeps the full toolbar set without converting on open |
| Export | from a `.domdoc`: text → `.docx` or PDF; image → PNG, JPEG, TIFF, or PDF |

Save of the original and Store as domdoc are separate. Video and audio are specified elsewhere.
