import { Component } from "@angular/core";
import { bundlesFromCdn, type ViewerOptions } from "@domdoc/core";
import { DomdocProvider } from "@/components/domdoc/domdoc-provider";
import { DomdocToolbar } from "@/components/domdoc/toolbar";
import { DomdocViewerShell } from "@/components/domdoc/viewer-shell";

declare const DOMDOC_EXAMPLES_BUNDLES: string;

/** Bundle root fixed by the Angular `define` option. */
function bundleBase(): string {
  const configured = typeof DOMDOC_EXAMPLES_BUNDLES === "string" ? DOMDOC_EXAMPLES_BUNDLES.trim() : "";
  return `${(configured || "/api/bundles/0.0.1/").replace(/\/+$/, "")}/`;
}

const bundles = bundleBase();

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DomdocProvider, DomdocToolbar, DomdocViewerShell],
  template: `
    <domdoc-provider class="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      <domdoc-toolbar />
      <domdoc-viewer-shell class="min-h-0 flex-1" [options]="options" />
    </domdoc-provider>
  `,
})
export class App {
  readonly options: ViewerOptions = {
    bundles: bundlesFromCdn(bundles),
    fontsWasmBase: `${bundles}fonts/`,
    toolbar: false,
  };
}
