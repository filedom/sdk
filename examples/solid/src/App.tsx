import { bundlesFromCdn } from "@filedom/core";
import { FiledomProvider } from "@/components/filedom/filedom-provider";
import { Toolbar } from "@/components/filedom/toolbar";
import { ViewerShell } from "@/components/filedom/viewer-shell";

const bundlesBase = import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

const options = {
  bundles: bundlesFromCdn(bundlesBase),
  toolbar: false,
  fontsWasmBase: `${bundlesBase.replace(/\/$/, "")}/fonts/`,
};

export function App() {
  return (
    <FiledomProvider options={options}>
      <div class="flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
        <Toolbar />
        <ViewerShell />
      </div>
    </FiledomProvider>
  );
}
