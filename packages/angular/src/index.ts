import { createViewer, type DomdocViewer as Viewer, type ViewerOptions } from "@domdoc/core";
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
export function mountDomdocViewer(
  host: ElementRef<HTMLElement> | HTMLElement,
  options: ViewerOptions,
  destroyRef?: Pick<DestroyRef, "onDestroy">,
): Viewer {
  const element = host instanceof HTMLElement ? host : host.nativeElement;
  const viewer = createViewer(element, options);
  destroyRef?.onDestroy(() => viewer.destroy());
  return viewer;
}

/** `<div [domdocViewer]="options" (domdocReady)="onReady($event)"></div>` (JIT builds). */
@Directive({ selector: "[domdocViewer]", standalone: true, exportAs: "domdocViewer" })
export class DomdocViewerDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) domdocViewer!: ViewerOptions;
  @Output() readonly domdocReady = new EventEmitter<Viewer>();
  viewer?: Viewer;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnChanges(): void {
    this.viewer?.destroy();
    this.viewer = createViewer(this.host.nativeElement, this.domdocViewer);
    this.domdocReady.emit(this.viewer);
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }
}
