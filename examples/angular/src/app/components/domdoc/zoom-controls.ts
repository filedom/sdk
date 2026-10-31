import { Component, computed, inject } from "@angular/core";
import { LucideAngularModule, Maximize2, UnfoldHorizontal, ZoomIn, ZoomOut } from "lucide-angular";
import { DomdocButton } from "@/components/domdoc/button";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";
import { DomdocTooltip } from "@/components/domdoc/tooltip";

@Component({
  selector: "domdoc-zoom-controls",
  standalone: true,
  imports: [DomdocButton, DomdocTooltip, LucideAngularModule],
  template: `
    <div data-slot="zoom-controls" class="flex items-center gap-0.5">
      @if (!zoomOut().hidden) {
        <domdoc-tooltip [text]="zoomOut().title">
          <button
            domdocButton
            slot="zoom-out"
            data-action="zoomOut"
            variant="icon"
            aria-label="Zoom out"
            [disabled]="zoomOut().disabled"
            [attr.title]="zoomOut().disabled ? zoomOut().title : null"
            (click)="run('zoomOut')"
          >
            <lucide-icon [img]="zoomOutIcon" [size]="16" aria-hidden="true" />
          </button>
        </domdoc-tooltip>
      }
      @if (!zoomReset().hidden) {
        <button
          domdocButton
          slot="zoom-label"
          data-action="zoomReset"
          variant="ghost"
          aria-label="Actual size"
          [disabled]="zoomReset().disabled"
          [attr.title]="zoomReset().disabled ? zoomReset().title : null"
          (click)="run('zoomReset')"
        >
          <span class="min-w-12 text-center text-xs tabular-nums">{{ percent() }}</span>
        </button>
      }
      @if (!zoomIn().hidden) {
        <domdoc-tooltip [text]="zoomIn().title">
          <button
            domdocButton
            slot="zoom-in"
            data-action="zoomIn"
            variant="icon"
            aria-label="Zoom in"
            [disabled]="zoomIn().disabled"
            [attr.title]="zoomIn().disabled ? zoomIn().title : null"
            (click)="run('zoomIn')"
          >
            <lucide-icon [img]="zoomInIcon" [size]="16" aria-hidden="true" />
          </button>
        </domdoc-tooltip>
      }
      @if (!fitWidth().hidden) {
        <domdoc-tooltip [text]="fitWidth().title">
          <button
            domdocButton
            slot="fit-width"
            data-action="fitWidth"
            variant="icon"
            aria-label="Fit width"
            [disabled]="fitWidth().disabled"
            [attr.title]="fitWidth().disabled ? fitWidth().title : null"
            (click)="run('fitWidth')"
          >
            <lucide-icon [img]="fitWidthIcon" [size]="16" aria-hidden="true" />
          </button>
        </domdoc-tooltip>
      }
      @if (!fitPage().hidden) {
        <domdoc-tooltip [text]="fitPage().title">
          <button
            domdocButton
            slot="fit-page"
            data-action="fitPage"
            variant="icon"
            aria-label="Fit page"
            [disabled]="fitPage().disabled"
            [attr.title]="fitPage().disabled ? fitPage().title : null"
            (click)="run('fitPage')"
          >
            <lucide-icon [img]="fitPageIcon" [size]="16" aria-hidden="true" />
          </button>
        </domdoc-tooltip>
      }
    </div>
  `,
})
export class DomdocZoomControls {
  private readonly ctx = inject(DomdocContext);
  readonly zoomOutIcon = ZoomOut;
  readonly zoomInIcon = ZoomIn;
  readonly fitWidthIcon = UnfoldHorizontal;
  readonly fitPageIcon = Maximize2;
  readonly zoomOut = computed(() => this.ctx.control("zoomOut", "Zoom out"));
  readonly zoomReset = computed(() => this.ctx.control("zoomReset", "Actual size"));
  readonly zoomIn = computed(() => this.ctx.control("zoomIn", "Zoom in"));
  readonly fitWidth = computed(() => this.ctx.control("fitWidth", "Fit width"));
  readonly fitPage = computed(() => this.ctx.control("fitPage", "Fit page"));
  readonly percent = computed(() => `${Math.round((this.ctx.snapshot()?.zoom ?? 1) * 100)}%`);

  run(actionId: string): void {
    if (!this.ctx.attached()) return;
    this.ctx.store.run(actionId);
  }
}
