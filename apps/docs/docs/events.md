---
sidebar_position: 2
title: Events
---

# Events

DOM chrome emits events. Rust stores the file. They do not share objects.

## Shell (DOM only)

| Group | Events |
| --- | --- |
| View | `setZoom`, `stepZoom`, `fit`, `setTheme`, `setToolbarVisible`, `lockToolbars`, `moveToolbar` |
| Help | `setHelp` |

## Document (cross the boundary)

| Group | To Rust | From Rust |
| --- | --- | --- |
| File | `createDocument`, `open`, `save`, `storeDomdoc`, `export` | `document`, `error` |
| History | `undo`, `redo`, `restoreHistory` | `history`, `applied` |
| Mode | `setMode` (`live`, `track`, `view`) | `mode` |
| Find | `search`, `nextHit` | `hits` |
| Text | `pointer`, `select`, `selectAll`, `text`, `format`, `setParagraph`, `highlight`, `addComment` | `selection` |
| Image | `pointer`, `transformObject`, `deleteObject` | `elements` |
| Shape | `pointer`, `transformObject`, `deleteObject` | `elements` |
| Insert | `insertElement` | `elements` |
| Layers | `setLayer` | `layers` |

`pointer` is the shared hit event. The toolbar for the hit kind handles it. `need` means a format bundle is not loaded yet.

## History and layers

- `restoreHistory` jumps to a named history entry; later entries stay available to step forward.
- `setLayer` shows, hides, or locks a layer. PDF objects carry `layerId` when the file has layers (one default layer when none exist).
- `createDocument` and `storeDomdoc` are file events: New builds an empty `.domdoc`; Store as domdoc snapshots a native session.
