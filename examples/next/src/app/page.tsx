"use client";

import { useMemo, useState } from "react";
import { bundlesFromCdn } from "@filedom/core";
import { FiledomViewer, type Viewer } from "@filedom/react";
import { FiledomProvider } from "@/components/filedom/filedom-provider";
import { Toolbar } from "@/components/filedom/toolbar";
import { ViewerShell } from "@/components/filedom/viewer-shell";

const BUNDLE_BASE = process.env.FILEDOM_EXAMPLES_BUNDLES || "https://cdn.filedom.io/0.2.0";

export default function Page() {
  const options = useMemo(
    () => ({
      bundles: bundlesFromCdn(BUNDLE_BASE),
      toolbar: false as const,
      fontsWasmBase: `${BUNDLE_BASE.replace(/\/$/, "")}/fonts/`,
    }),
    [],
  );
  const [viewer, setViewer] = useState<Viewer | null>(null);
  return (
    <FiledomProvider viewer={viewer}>
      <div className="flex h-dvh flex-col">
        <Toolbar />
        <ViewerShell>
          <FiledomViewer options={options} onReady={setViewer} className="h-full w-full" />
        </ViewerShell>
      </div>
    </FiledomProvider>
  );
}
