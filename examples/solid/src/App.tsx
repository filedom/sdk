import { bundlesFromCdn } from "@domdoc/core";
import { DomdocProvider } from "@/components/domdoc/domdoc-provider";
import { Toolbar } from "@/components/domdoc/toolbar";
import { ViewerShell } from "@/components/domdoc/viewer-shell";

const bundlesBase = import.meta.env.DOMDOC_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

const options = {
  bundles: bundlesFromCdn(bundlesBase),
  toolbar: false,
  fontsWasmBase: `${bundlesBase.replace(/\/$/, "")}/fonts/`,
};

export function App() {
  return (
    <DomdocProvider options={options}>
      <div class="flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
        <Toolbar />
        <ViewerShell />
      </div>
    </DomdocProvider>
  );
}
