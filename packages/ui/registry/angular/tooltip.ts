import { Component, Input } from "@angular/core";

/** Hover and focus label. The trigger is projected; the bubble is visual only. */
@Component({
  selector: "domdoc-tooltip",
  standalone: true,
  template: `
    <span data-slot="tooltip" class="group relative inline-flex">
      <ng-content />
      @if (text) {
        <span
          role="tooltip"
          class="pointer-events-none absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {{ text }}
        </span>
      }
    </span>
  `,
})
export class DomdocTooltip {
  @Input() text = "";
}
