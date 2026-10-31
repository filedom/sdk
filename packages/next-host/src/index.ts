"use client";
// Client boundary for the App Router: import this from a Server Component tree and the
// viewer (and its wasm bundles) only ever load in the browser.
export { DomdocViewer, type DomdocViewerProps } from "@domdoc/react";
export type { Viewer, ViewerOptions } from "@domdoc/react";

/** Browser-only lazy import of the core SDK (e.g. for headless `openDocument`). */
export function loadDomdoc(): Promise<typeof import("@domdoc/core")> {
  if (typeof window === "undefined") return Promise.reject(new Error("@domdoc/core is browser-only"));
  return import("@domdoc/core");
}
