import { bundlesFromCdn } from "@filedom/core";
import { FiledomProviderElement } from "@/components/filedom/filedom-provider";
import "@/components/filedom/toolbar";
import "@/components/filedom/viewer-shell";
import "./index.css";

const bundlesBase = import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

const provider = document.createElement("filedom-provider") as FiledomProviderElement;
provider.options = {
  bundles: bundlesFromCdn(bundlesBase),
  toolbar: false,
  fontsWasmBase: `${bundlesBase.replace(/\/$/, "")}/fonts/`,
};

const layout = document.createElement("div");
layout.className = "flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground";
layout.append(document.createElement("filedom-toolbar"), document.createElement("filedom-viewer-shell"));
provider.append(layout);
document.body.append(provider);
