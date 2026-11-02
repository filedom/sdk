import { Directive, Input } from "@angular/core";

/** Text input. A block's `slot` input replaces the default `input` slot. */
@Directive({
  selector: "input[filedomInput]",
  standalone: true,
  host: {
    "[attr.data-slot]": "slot",
    class:
      "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
  },
})
export class FiledomInput {
  @Input() slot = "input";
}
