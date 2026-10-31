import { html, type TemplateResult } from "lit";

export function separator(orientation: "horizontal" | "vertical" = "horizontal"): TemplateResult {
  const vertical = orientation === "vertical";
  return html`<div
    data-slot="separator"
    role="separator"
    aria-orientation=${vertical ? "vertical" : "horizontal"}
    class=${vertical ? "mx-1 h-5 w-px shrink-0 bg-border" : "my-1 h-px w-full shrink-0 bg-border"}
  ></div>`;
}
