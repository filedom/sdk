import { bundlesFromCdn } from "@domdoc/core";
import { DomdocProviderElement } from "@/components/domdoc/domdoc-provider";
import "@/components/domdoc/toolbar";
import "@/components/domdoc/viewer-shell";
import "./index.css";

const bundlesBase = import.meta.env.DOMDOC_EXAMPLES_BUNDLES || "/api/bundles/0.0.1";

const provider = document.createElement("domdoc-provider") as DomdocProviderElement;
provider.options = {
  bundles: bundlesFromCdn(bundlesBase),
  toolbar: false,
  fontsWasmBase: `${bundlesBase.replace(/\/$/, "")}/fonts/`,
};

const layout = document.createElement("div");
layout.className = "flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground";
layout.append(document.createElement("domdoc-toolbar"), document.createElement("domdoc-viewer-shell"));
provider.append(layout);
document.body.append(provider);
