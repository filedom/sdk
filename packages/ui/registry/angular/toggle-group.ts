import { Component, Directive, Input } from "@angular/core";
import { cn } from "@/lib/cn";

@Component({
  selector: "filedom-toggle-group",
  standalone: true,
  template: `<div data-slot="toggle-group" role="group" class="inline-flex items-center gap-0.5"><ng-content /></div>`,
})
export class FiledomToggleGroup {}

/** Pressed-state button. `aria-pressed` follows the `pressed` input. */
@Directive({
  selector: "button[filedomToggleItem]",
  standalone: true,
  host: {
    type: "button",
    "data-slot": "toggle-group-item",
    "[attr.aria-pressed]": "pressed ? 'true' : 'false'",
    "[class]": "hostClass",
  },
})
export class FiledomToggleItem {
  @Input() pressed = false;

  get hostClass(): string {
    return cn(
      "inline-flex h-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      this.pressed ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
    );
  }
}
