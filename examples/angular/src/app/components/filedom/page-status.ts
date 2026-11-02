import { Component, computed, inject } from "@angular/core";
import { FiledomContext } from "@/components/filedom/filedom-provider";

@Component({
  selector: "filedom-page-status",
  standalone: true,
  template: `
    <span data-slot="page-status" class="max-w-48 truncate px-2 text-xs text-muted-foreground" [attr.title]="label()">
      {{ label() }}
    </span>
  `,
})
export class FiledomPageStatus {
  private readonly ctx = inject(FiledomContext);
  readonly label = computed(() => {
    const document = this.ctx.snapshot()?.document;
    if (!document) return "No document";
    const pages = document.pageCount === 1 ? "1 page" : `${document.pageCount} pages`;
    return document.name ? `${document.name} · ${pages}` : pages;
  });
}
