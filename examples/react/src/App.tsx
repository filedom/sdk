import { useMemo, useState } from "react";
import { bundlesFromCdn } from "@domdoc/core";
import { DomdocViewer, type Viewer } from "@domdoc/react";
import { DomdocProvider } from "@/components/domdoc/domdoc-provider";
import { Toolbar } from "@/components/domdoc/toolbar";
import { ViewerShell } from "@/components/domdoc/viewer-shell";

const BUNDLE_BASE = import.meta.env.DOMDOC_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

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
    <DomdocProvider viewer={viewer}>
      <div className="flex h-dvh flex-col bg-background font-sans text-foreground">
        <Toolbar />
        <ViewerShell>
          <DomdocViewer options={options} onReady={setViewer} className="h-full w-full" />
        </ViewerShell>
      </div>
    </DomdocProvider>
  );
}
