import { Directive, Input } from "@angular/core";
import { cn } from "@/lib/cn";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

const VARIANTS = {
  default: "h-8 bg-primary px-3 text-primary-foreground hover:bg-primary/90",
  outline: "h-8 border border-border bg-background px-3 hover:bg-accent hover:text-accent-foreground",
  ghost: "h-8 px-2 hover:bg-accent hover:text-accent-foreground",
  icon: "size-8 hover:bg-accent hover:text-accent-foreground",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/** Button primitive. A block's `slot` input replaces the default `button` slot. */
@Directive({
  selector: "button[domdocButton]",
  standalone: true,
  host: {
    type: "button",
    "[attr.data-slot]": "slot",
    "[class]": "hostClass",
  },
})
export class DomdocButton {
  @Input() slot = "button";
  @Input() variant: ButtonVariant = "default";

  get hostClass(): string {
    return cn(BASE, VARIANTS[this.variant]);
  }
}
