import { Component, computed, inject } from "@angular/core";
import { LucideAngularModule, Redo2, Undo2 } from "lucide-angular";
import { FiledomButton } from "@/components/filedom/button";
import { FiledomContext } from "@/components/filedom/filedom-provider";
import { FiledomFileButton } from "@/components/filedom/file-button";
import { FiledomModeSelect } from "@/components/filedom/mode-select";
import { FiledomPageStatus } from "@/components/filedom/page-status";
import { FiledomSearchBar } from "@/components/filedom/search-bar";
import { FiledomSeparator } from "@/components/filedom/separator";
import { FiledomThemeToggle } from "@/components/filedom/theme-toggle";
import { FiledomTooltip } from "@/components/filedom/tooltip";
import { FiledomZoomControls } from "@/components/filedom/zoom-controls";

@Component({
  selector: "filedom-toolbar",
  standalone: true,
  imports: [
    FiledomButton,
    FiledomFileButton,
    FiledomModeSelect,
    FiledomPageStatus,
    FiledomSearchBar,
    FiledomSeparator,
    FiledomThemeToggle,
    FiledomTooltip,
    FiledomZoomControls,
    LucideAngularModule,
  ],
  host: { class: "shrink-0" },
  template: `
    <div data-slot="toolbar" class="flex h-toolbar items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 text-foreground">
      @if (!undo().hidden) {
        <filedom-tooltip [text]="undo().title">
          <button
            filedomButton
            slot="undo"
            data-action="undo"
            variant="icon"
            aria-label="Undo"
            [disabled]="undo().disabled"
            [attr.title]="undo().disabled ? undo().title : null"
            (click)="run('undo')"
          >
            <lucide-icon [img]="undoIcon" [size]="16" aria-hidden="true" />
          </button>
        </filedom-tooltip>
      }
      @if (!redo().hidden) {
        <filedom-tooltip [text]="redo().title">
          <button
            filedomButton
            slot="redo"
            data-action="redo"
            variant="icon"
            aria-label="Redo"
            [disabled]="redo().disabled"
            [attr.title]="redo().disabled ? redo().title : null"
            (click)="run('redo')"
          >
            <lucide-icon [img]="redoIcon" [size]="16" aria-hidden="true" />
          </button>
        </filedom-tooltip>
      }
      <filedom-separator orientation="vertical" />
      <filedom-file-button />
      <filedom-separator orientation="vertical" />
      <filedom-zoom-controls />
      <filedom-separator orientation="vertical" />
      <filedom-search-bar />
      <div class="ml-auto flex shrink-0 items-center gap-1">
        <filedom-mode-select />
        <filedom-theme-toggle />
        <filedom-page-status />
      </div>
    </div>
  `,
})
export class FiledomToolbar {
  private readonly ctx = inject(FiledomContext);
  readonly undoIcon = Undo2;
  readonly redoIcon = Redo2;
  readonly undo = computed(() => this.ctx.control("undo", "Undo"));
  readonly redo = computed(() => this.ctx.control("redo", "Redo"));

  run(actionId: string): void {
    if (!this.ctx.attached()) return;
    this.ctx.store.run(actionId);
  }
}
