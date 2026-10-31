import { Component, computed, inject } from "@angular/core";
import { LucideAngularModule, Redo2, Undo2 } from "lucide-angular";
import { DomdocButton } from "@/components/domdoc/button";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";
import { DomdocFileButton } from "@/components/domdoc/file-button";
import { DomdocModeSelect } from "@/components/domdoc/mode-select";
import { DomdocPageStatus } from "@/components/domdoc/page-status";
import { DomdocSearchBar } from "@/components/domdoc/search-bar";
import { DomdocSeparator } from "@/components/domdoc/separator";
import { DomdocThemeToggle } from "@/components/domdoc/theme-toggle";
import { DomdocTooltip } from "@/components/domdoc/tooltip";
import { DomdocZoomControls } from "@/components/domdoc/zoom-controls";

@Component({
  selector: "domdoc-toolbar",
  standalone: true,
  imports: [
    DomdocButton,
    DomdocFileButton,
    DomdocModeSelect,
    DomdocPageStatus,
    DomdocSearchBar,
    DomdocSeparator,
    DomdocThemeToggle,
    DomdocTooltip,
    DomdocZoomControls,
    LucideAngularModule,
  ],
  host: { class: "shrink-0" },
  template: `
    <div data-slot="toolbar" class="flex h-toolbar items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 text-foreground">
      @if (!undo().hidden) {
        <domdoc-tooltip [text]="undo().title">
          <button
            domdocButton
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
        </domdoc-tooltip>
      }
      @if (!redo().hidden) {
        <domdoc-tooltip [text]="redo().title">
          <button
            domdocButton
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
        </domdoc-tooltip>
      }
      <domdoc-separator orientation="vertical" />
      <domdoc-file-button />
      <domdoc-separator orientation="vertical" />
      <domdoc-zoom-controls />
      <domdoc-separator orientation="vertical" />
      <domdoc-search-bar />
      <div class="ml-auto flex shrink-0 items-center gap-1">
        <domdoc-mode-select />
        <domdoc-theme-toggle />
        <domdoc-page-status />
      </div>
    </div>
  `,
})
export class DomdocToolbar {
  private readonly ctx = inject(DomdocContext);
  readonly undoIcon = Undo2;
  readonly redoIcon = Redo2;
  readonly undo = computed(() => this.ctx.control("undo", "Undo"));
  readonly redo = computed(() => this.ctx.control("redo", "Redo"));

  run(actionId: string): void {
    if (!this.ctx.attached()) return;
    this.ctx.store.run(actionId);
  }
}
