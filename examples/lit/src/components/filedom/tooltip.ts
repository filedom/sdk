import { html, type TemplateResult } from "lit";

export function tooltip(label: string, content: unknown): TemplateResult {
  return html`<span data-slot="tooltip" class="group relative inline-flex">
    ${content}
    <span
      role="tooltip"
      class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm ring-1 ring-border group-hover:opacity-100 group-focus-within:opacity-100"
      >${label}</span
    >
  </span>`;
}
