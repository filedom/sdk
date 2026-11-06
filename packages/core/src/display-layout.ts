import type { Format } from "./engine-types.js";
import { fileKind } from "./formats.js";
import type { IconName } from "./icons.js";
import { isCodeFile } from "./code-editor.js";

/** How the open file is drawn. */
export type DisplayLayout = "numbered" | "paginated" | "frame";

export const DISPLAY_LAYOUTS: { id: DisplayLayout; label: string; icon: IconName }[] = [
  { id: "numbered", label: "Numbered", icon: "numbered" },
  { id: "paginated", label: "Paginated", icon: "pages" },
  { id: "frame", label: "Frame", icon: "frame" },
];

/**
 * The layout a file opens in.
 * Source is a full-width numbered element. Pictures, sound, video, archives, and mail sit in a frame.
 * Documents open as pages.
 */
export function defaultDisplayLayout(name: string, format?: Format): DisplayLayout {
  if (isCodeFile(name)) return "numbered";
  if (!format) return "numbered";
  const kind = fileKind(format);
  if (kind === "image" || kind === "vector" || kind === "audio" || kind === "video" || kind === "archive" || kind === "email") {
    return "frame";
  }
  return "paginated";
}
