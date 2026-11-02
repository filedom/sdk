import { Component, computed, inject } from "@angular/core";
import { ACCEPT } from "@filedom/core";
import { FolderOpen, LucideAngularModule } from "lucide-angular";
import { FiledomButton } from "@/components/filedom/button";
import { FiledomContext } from "@/components/filedom/filedom-provider";
import { FiledomTooltip } from "@/components/filedom/tooltip";

@Component({
  selector: "filedom-file-button",
  standalone: true,
  imports: [FiledomButton, FiledomTooltip, LucideAngularModule],
  host: { class: "relative inline-flex" },
  template: `
    <input #picker class="sr-only" type="file" tabindex="-1" [hidden]="open().hidden" [accept]="accept" (change)="openFile($event)" />
    @if (!open().hidden) {
      <filedom-tooltip [text]="open().title">
        <button
          filedomButton
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
      </filedom-tooltip>
    }
  `,
})
export class FiledomFileButton {
  private readonly ctx = inject(FiledomContext);
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
