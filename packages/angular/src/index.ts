import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";
import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
  type DestroyRef,
  type OnChanges,
  type OnDestroy,
} from "@angular/core";

export type { Viewer, ViewerOptions };

/**
 * AOT-safe helper for components: call from `afterNextRender` (or `ngAfterViewInit`)
 * with the host element; the viewer is destroyed with the `DestroyRef`.
 */
export function mountFiledomViewer(
  host: ElementRef<HTMLElement> | HTMLElement,
  options: ViewerOptions,
  destroyRef?: Pick<DestroyRef, "onDestroy">,
): Viewer {
  const element = host instanceof HTMLElement ? host : host.nativeElement;
  const viewer = createViewer(element, options);
  destroyRef?.onDestroy(() => viewer.destroy());
  return viewer;
}

/** `<div [filedomViewer]="options" (filedomReady)="onReady($event)"></div>` (JIT builds). */
@Directive({ selector: "[filedomViewer]", standalone: true, exportAs: "filedomViewer" })
export class FiledomViewerDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) filedomViewer!: ViewerOptions;
  @Output() readonly filedomReady = new EventEmitter<Viewer>();
  viewer?: Viewer;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnChanges(): void {
    this.viewer?.destroy();
    this.viewer = createViewer(this.host.nativeElement, this.filedomViewer);
    this.filedomReady.emit(this.viewer);
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }
}
