import { Component, computed, inject } from "@angular/core";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";
import { DomdocSelect } from "@/components/domdoc/select";

@Component({
  selector: "domdoc-mode-select",
  standalone: true,
  imports: [DomdocSelect],
  template: `
    <select
      domdocSelect
      slot="mode-select"
      aria-label="View mode"
      [value]="mode()"
      (change)="onMode($event)"
    >
      <option value="live" data-action="live" [disabled]="live().hidden || live().disabled">Live</option>
      <option value="track" data-action="track" [disabled]="track().hidden || track().disabled">Track</option>
      <option value="view" data-action="view" [disabled]="view().hidden || view().disabled">View</option>
    </select>
  `,
})
export class DomdocModeSelect {
  private readonly ctx = inject(DomdocContext);
  readonly mode = computed(() => this.ctx.snapshot()?.viewMode ?? "live");
  readonly live = computed(() => this.ctx.control("live", "Live"));
  readonly track = computed(() => this.ctx.control("track", "Track changes"));
  readonly view = computed(() => this.ctx.control("view", "View only"));

  onMode(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value !== "live" && value !== "track" && value !== "view") return;
    if (!this.ctx.attached()) return;
    const result = this.ctx.store.run(value);
    if (result.status === "unsupported") select.value = this.mode();
  }
}
