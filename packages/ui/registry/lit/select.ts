import { html, nothing, type TemplateResult } from "lit";
import { cn } from "@/lib/cn";

export function select(options: {
  slot?: string;
  class?: string;
  disabled?: boolean;
  title?: string;
  value?: string;
  ariaLabel?: string;
  onChange?: (event: Event) => void;
  label?: unknown;
}): TemplateResult {
  const slot = options.slot ?? "select";
  return html`<select
    data-slot=${slot}
    class=${cn(
      "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
      options.class,
    )}
    ?disabled=${options.disabled === true}
    title=${options.title || nothing}
    aria-label=${options.ariaLabel ?? nothing}
    .value=${options.value ?? ""}
    @change=${options.onChange}
  >
    ${options.label}
  </select>`;
}
