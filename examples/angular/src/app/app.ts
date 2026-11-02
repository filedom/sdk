import { Component } from "@angular/core";
import { bundlesFromCdn, type ViewerOptions } from "@filedom/core";
import { FiledomProvider } from "@/components/filedom/filedom-provider";
import { FiledomToolbar } from "@/components/filedom/toolbar";
import { FiledomViewerShell } from "@/components/filedom/viewer-shell";

declare const FILEDOM_EXAMPLES_BUNDLES: string;

/** Bundle root fixed by the Angular `define` option. */
function bundleBase(): string {
  const configured = typeof FILEDOM_EXAMPLES_BUNDLES === "string" ? FILEDOM_EXAMPLES_BUNDLES.trim() : "";
  return `${(configured || "/api/bundles/0.0.1/").replace(/\/+$/, "")}/`;
}

const bundles = bundleBase();

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FiledomProvider, FiledomToolbar, FiledomViewerShell],
  template: `
    <filedom-provider class="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      <filedom-toolbar />
      <filedom-viewer-shell class="min-h-0 flex-1" [options]="options" />
    </filedom-provider>
  `,
})
export class App {
  readonly options: ViewerOptions = {
    bundles: bundlesFromCdn(bundles),
    fontsWasmBase: `${bundles}fonts/`,
    toolbar: false,
  };
}
