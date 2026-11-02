import { Directive, Input } from "@angular/core";

/** Native select. A block's `slot` input replaces the default `select` slot. */
@Directive({
  selector: "select[filedomSelect]",
  standalone: true,
  host: {
    "[attr.data-slot]": "slot",
    class:
      "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
  },
})
export class FiledomSelect {
  @Input() slot = "select";
}
