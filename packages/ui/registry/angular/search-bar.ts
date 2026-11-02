import { Component, ElementRef, computed, effect, inject, viewChild } from "@angular/core";
import { ChevronDown, ChevronUp, LucideAngularModule } from "lucide-angular";
import { FiledomButton } from "@/components/filedom/button";
import { FiledomContext } from "@/components/filedom/filedom-provider";
import { FiledomInput } from "@/components/filedom/input";
import { FiledomTooltip } from "@/components/filedom/tooltip";

@Component({
  selector: "filedom-search-bar",
  standalone: true,
  imports: [FiledomButton, FiledomInput, FiledomTooltip, LucideAngularModule],
  template: `
    <div data-slot="search-bar" class="flex items-center gap-0.5">
      @if (!search().hidden) {
        <input
          #field
          filedomInput
          slot="search-input"
          data-action="search"
          class="w-40"
          type="search"
          placeholder="Search"
          autocomplete="off"
          [disabled]="search().disabled"
          [attr.title]="search().disabled ? search().title : null"
          [attr.aria-label]="search().title"
          (input)="onSearch($event)"
        />
      }
      <span data-slot="search-count" class="min-w-10 px-1 text-center text-xs text-muted-foreground tabular-nums">{{ count() }}</span>
      @if (!findPrev().hidden) {
        <filedom-tooltip [text]="findPrev().title">
          <button
            filedomButton
            slot="search-prev"
            data-action="findPrev"
            variant="icon"
            aria-label="Previous match"
            [disabled]="findPrev().disabled"
            [attr.title]="findPrev().disabled ? findPrev().title : null"
            (click)="run('findPrev')"
          >
            <lucide-icon [img]="prevIcon" [size]="16" aria-hidden="true" />
          </button>
        </filedom-tooltip>
      }
      @if (!findNext().hidden) {
        <filedom-tooltip [text]="findNext().title">
          <button
            filedomButton
            slot="search-next"
            data-action="findNext"
            variant="icon"
            aria-label="Next match"
            [disabled]="findNext().disabled"
            [attr.title]="findNext().disabled ? findNext().title : null"
            (click)="run('findNext')"
          >
            <lucide-icon [img]="nextIcon" [size]="16" aria-hidden="true" />
          </button>
        </filedom-tooltip>
      }
    </div>
  `,
})
export class FiledomSearchBar {
  private readonly ctx = inject(FiledomContext);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>("field");
  readonly prevIcon = ChevronUp;
  readonly nextIcon = ChevronDown;
  readonly search = computed(() => this.ctx.control("search", "Search"));
  readonly findPrev = computed(() => this.ctx.control("findPrev", "Previous match"));
  readonly findNext = computed(() => this.ctx.control("findNext", "Next match"));
  readonly count = computed(() => {
    const search = this.ctx.snapshot()?.search;
    if (!search || search.hitCount === 0) return "0";
    return `${search.hitIndex + 1}/${search.hitCount}`;
  });

  constructor() {
    effect(() => {
      const query = this.ctx.snapshot()?.search.query ?? "";
      const element = this.field()?.nativeElement;
      if (!element || document.activeElement === element || element.value === query) return;
      element.value = query;
    });
  }

  onSearch(event: Event): void {
    if (!this.ctx.attached() || this.search().disabled) return;
    const value = (event.target as HTMLInputElement).value;
    this.ctx.store.viewer.search(value);
  }

  run(actionId: string): void {
    if (!this.ctx.attached()) return;
    this.ctx.store.run(actionId);
  }
}
