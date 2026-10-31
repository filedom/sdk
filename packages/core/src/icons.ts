/** Icons on a 24×24 grid for commands that already have a standard symbol. */
export type IconName =
  | "folder"
  | "download"
  | "undo"
  | "redo"
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-justify"
  | "outdent"
  | "indent"
  | "highlight"
  | "eraser"
  | "comment"
  | "arrow-up"
  | "arrow-down"
  | "fit-width"
  | "fit-page"
  | "moon"
  | "sun"
  | "check"
  | "x";

type Mark = string | { readonly d: string; readonly fill: true };

const PATHS: Record<IconName, readonly Mark[]> = {
  folder: ["M3 8V6.5h5.5L10.5 8.5H21V19H3Z"],
  download: ["M12 4v11", "M7.5 10.5 12 15l4.5-4.5", "M5 19.5h14"],
  undo: ["M9 14 4 9l5-5", "M4 9h10a5 5 0 0 1 0 10H11"],
  redo: ["M15 14l5-5-5-5", "M20 9H10a5 5 0 0 0 0 10h3"],
  "align-left": ["M4 6h16", "M4 10h10", "M4 14h16", "M4 18h8"],
  "align-center": ["M4 6h16", "M7 10h10", "M4 14h16", "M8 18h8"],
  "align-right": ["M4 6h16", "M10 10h10", "M4 14h16", "M12 18h8"],
  "align-justify": ["M4 6h16", "M4 10h16", "M4 14h16", "M4 18h16"],
  outdent: ["M11 6h10", "M11 10h10", "M11 14h10", "M11 18h10", "M9 12H3", "M5.5 9.5 3 12l2.5 2.5"],
  indent: ["M3 6h10", "M3 10h10", "M3 14h10", "M3 18h10", "M15 12h6", "M18.5 9.5 21 12l-2.5 2.5"],
  highlight: [{ d: "M6.5 14.5 13 7h6L12.5 14.5H6.5Z", fill: true }, "M4 19.5h11"],
  eraser: ["M16 4.5 20.5 9 9.5 20H5.5L4 15.5Z", "M8.5 12.5 14 18"],
  comment: ["M5 5.5h14v9H9.5L5 18.5Z"],
  "arrow-up": ["M12 19V6", "M6.5 11.5 12 6l5.5 5.5"],
  "arrow-down": ["M12 5v13", "M6.5 12.5 12 18l5.5-5.5"],
  "fit-width": ["M4 5v14", "M20 5v14", "M10 12H5", "M7.5 9.5 5 12l2.5 2.5", "M14 12h5", "M16.5 9.5 19 12l-2.5 2.5"],
  "fit-page": ["M9 4H4v5", "M15 4h5v5", "M20 15v5h-5", "M4 15v5h5", "M9 9h6v6H9Z"],
  moon: ["M21 14.5A8.5 8.5 0 0 1 9.5 4 6.8 6.8 0 1 0 21 14.5Z"],
  sun: [
    "M12 8a4 4 0 0 1 0 8 4 4 0 0 1 0-8",
    "M12 2.5v2.5",
    "M12 19v2.5",
    "M4.2 4.2 6 6",
    "M18 18l1.8 1.8",
    "M2.5 12H5",
    "M19 12h2.5",
    "M4.2 19.8 6 18",
    "M18 6l1.8-1.8",
  ],
  check: ["M5 12.5 10 17.5 19 7"],
  x: ["M7 7l10 10", "M17 7 7 17"],
};

const NS = "http://www.w3.org/2000/svg";

export function icon(doc: Document, name: IconName): SVGSVGElement {
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("data-icon", name);
  for (const mark of PATHS[name]) {
    const path = doc.createElementNS(NS, "path");
    const filled = typeof mark !== "string";
    path.setAttribute("d", filled ? mark.d : mark);
    if (filled) {
      path.setAttribute("fill", "currentColor");
      path.setAttribute("stroke", "none");
    }
    svg.append(path);
  }
  return svg;
}
