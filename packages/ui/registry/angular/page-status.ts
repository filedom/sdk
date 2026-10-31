import { Component, computed, inject } from "@angular/core";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";

@Component({
  selector: "domdoc-page-status",
  standalone: true,
  template: `
    <span data-slot="page-status" class="max-w-48 truncate px-2 text-xs text-muted-foreground" [attr.title]="label()">
      {{ label() }}
    </span>
  `,
})
export class DomdocPageStatus {
  private readonly ctx = inject(DomdocContext);
  readonly label = computed(() => {
    const document = this.ctx.snapshot()?.document;
    if (!document) return "No document";
    const pages = document.pageCount === 1 ? "1 page" : `${document.pageCount} pages`;
    return document.name ? `${document.name} · ${pages}` : pages;
  });
}
