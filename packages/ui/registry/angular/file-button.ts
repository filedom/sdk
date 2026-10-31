import { Component, computed, inject } from "@angular/core";
import { ACCEPT } from "@domdoc/core";
import { FolderOpen, LucideAngularModule } from "lucide-angular";
import { DomdocButton } from "@/components/domdoc/button";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";
import { DomdocTooltip } from "@/components/domdoc/tooltip";

@Component({
  selector: "domdoc-file-button",
  standalone: true,
  imports: [DomdocButton, DomdocTooltip, LucideAngularModule],
  host: { class: "relative inline-flex" },
  template: `
    <input #picker class="sr-only" type="file" tabindex="-1" [hidden]="open().hidden" [accept]="accept" (change)="openFile($event)" />
    @if (!open().hidden) {
      <domdoc-tooltip [text]="open().title">
        <button
          domdocButton
          slot="file-button"
          data-action="open"
          variant="icon"
          aria-label="Open"
          [disabled]="open().disabled"
          [attr.title]="open().disabled ? open().title : null"
          (click)="picker.click()"
        >
          <lucide-icon [img]="openIcon" [size]="16" aria-hidden="true" />
        </button>
      </domdoc-tooltip>
    }
  `,
})
export class DomdocFileButton {
  private readonly ctx = inject(DomdocContext);
  readonly accept = ACCEPT;
  readonly openIcon = FolderOpen;
  readonly open = computed(() => this.ctx.control("open", "Open"));

  openFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.ctx.attached() || this.open().disabled) return;
    void this.ctx.store.viewer.open(file);
  }
}
