"use client";
// Client boundary for the App Router: import this from a Server Component tree and the
// viewer (and its wasm bundles) only ever load in the browser.
export { FiledomViewer, type FiledomViewerProps } from "@filedom/react";
export type { Viewer, ViewerOptions } from "@filedom/react";

/** Browser-only lazy import of the core SDK (e.g. for headless `openDocument`). */
export function loadFiledom(): Promise<typeof import("@filedom/core")> {
  if (typeof window === "undefined") return Promise.reject(new Error("@filedom/core is browser-only"));
  return import("@filedom/core");
}
