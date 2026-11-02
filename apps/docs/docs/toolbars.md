---
sidebar_position: 5
title: Toolbars
---

# Toolbars

The constant bar is a horizontal list of menus: File, History, Insert, Mode, Find, View, and Help. Each menu holds that group's actions. Insert is left off when the open format cannot place elements. Find searches the text of the open file, replaces the current match, or replaces every match. Replace stays disabled in view-only mode and when the format cannot edit text.

A toolbar appears only when it applies. Text tools show while editing text, image tools for an image, shape tools for a shape, and layer tools for a group. Track mode adds the track-changes toolbar. With nothing selected, only the menu bar is shown.

- **`.filedom`** shows every toolbar group.
- **Native files** hide groups the format cannot support.
- **PDF** shows the text toolbar for a text selection and the image toolbar for an image selection.
- A group that applies but mode or selection blocks it stays **visible and disabled**.
- **Audio and video** keep Play, Pause, and Mute in view mode. In Live or Track, Select on the player shows the timeline: drag a clip edge to trim it, change its speed, or add another file on the same track. View mode hides that timeline and the Select control. The playback controls stay on the player.

The View menu lists every toolbar and shows or hides each one. The View menu itself cannot be hidden. Lock freezes positions; unlocked, a toolbar can be dragged. `?` toggles short hover hints.

Toolbars are DOM nodes in the chrome. They do not scroll with the page. A host can replace a group through `ComponentRegistry`.
