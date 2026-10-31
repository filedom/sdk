import { html, type TemplateResult } from "lit";
import { cn } from "@/lib/cn";

export interface ToggleItem {
  label: string;
  value: string;
  pressed?: boolean;
  disabled?: boolean;
}

export function toggleGroup(options: {
  ariaLabel?: string;
  class?: string;
  items?: ToggleItem[];
  onToggle?: (value: string) => void;
} = {}): TemplateResult {
  const items = options.items ?? [];
  return html`<div
    data-slot="toggle-group"
    role="group"
    aria-label=${options.ariaLabel ?? "Toggle"}
    class=${cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5", options.class)}
  >
    ${items.map(
      (item) => html`<button
        type="button"
        data-slot="toggle-group-item"
        data-value=${item.value}
        aria-pressed=${item.pressed ? "true" : "false"}
        ?disabled=${item.disabled === true}
        class=${cn(
          "h-8 rounded-sm px-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-40",
          item.pressed && "bg-accent text-accent-foreground",
        )}
        @click=${() => options.onToggle?.(item.value)}
      >
        ${item.label}
      </button>`,
    )}
  </div>`;
}
