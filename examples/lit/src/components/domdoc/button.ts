import { html, nothing, type TemplateResult } from "lit";
import { cn } from "@/lib/cn";

export type ButtonVariant = "default" | "outline" | "ghost" | "icon";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  default: "h-8 bg-primary px-3 text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "h-8 border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground",
  ghost: "h-8 px-2.5 hover:bg-accent hover:text-accent-foreground",
  icon: "size-8 hover:bg-accent hover:text-accent-foreground",
};

export interface ButtonOptions {
  variant?: ButtonVariant;
  slot?: string;
  action?: string;
  class?: string;
  disabled?: boolean;
  hidden?: boolean;
  title?: string;
  label?: unknown;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
}

export function button(options: ButtonOptions = {}): TemplateResult {
  if (options.hidden) return html`${nothing}`;
  const slot = options.slot ?? "button";
  return html`<button
    type="button"
    data-slot=${slot}
    data-action=${options.action ?? nothing}
    class=${cn(base, variants[options.variant ?? "default"], options.class)}
    ?disabled=${options.disabled === true}
    title=${options.title || nothing}
    aria-label=${options.ariaLabel ?? nothing}
    @click=${options.onClick}
  >
    ${options.label}
  </button>`;
}
