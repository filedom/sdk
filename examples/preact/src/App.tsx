import { useMemo, useState } from "preact/hooks";
import { bundlesFromCdn } from "@filedom/core";
import { FiledomViewer, type Viewer } from "@filedom/preact";
import { FiledomProvider } from "@/components/filedom/filedom-provider";
import { Toolbar } from "@/components/filedom/toolbar";
import { ViewerShell } from "@/components/filedom/viewer-shell";

const BUNDLE_BASE = import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

export function App() {
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
      <div className="flex h-dvh flex-col bg-background font-sans text-foreground">
        <Toolbar />
        <ViewerShell>
          <FiledomViewer options={options} onReady={setViewer} class="h-full w-full" />
        </ViewerShell>
      </div>
    </FiledomProvider>
  );
}
