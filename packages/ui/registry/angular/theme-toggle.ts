import { Component, computed, inject } from "@angular/core";
import { LucideAngularModule, Moon, Sun } from "lucide-angular";
import { FiledomButton } from "@/components/filedom/button";
import { FiledomContext } from "@/components/filedom/filedom-provider";
import { FiledomTooltip } from "@/components/filedom/tooltip";

@Component({
  selector: "filedom-theme-toggle",
  standalone: true,
  imports: [FiledomButton, FiledomTooltip, LucideAngularModule],
  template: `
    @if (!theme().hidden) {
      <filedom-tooltip [text]="theme().title">
        <button
          filedomButton
          slot="theme-toggle"
          data-action="theme"
          variant="icon"
          [attr.aria-label]="theme().title"
          [disabled]="theme().disabled"
          [attr.title]="theme().disabled ? theme().title : null"
          (click)="toggle()"
        >
          @if (dark()) {
            <lucide-icon [img]="sunIcon" [size]="16" aria-hidden="true" />
          } @else {
            <lucide-icon [img]="moonIcon" [size]="16" aria-hidden="true" />
          }
        </button>
      </filedom-tooltip>
    }
  `,
})
export class FiledomThemeToggle {
  private readonly ctx = inject(FiledomContext);
  readonly sunIcon = Sun;
  readonly moonIcon = Moon;
  readonly dark = computed(() => {
    const theme = this.ctx.snapshot()?.theme;
    return theme === "dark" || theme === "high-contrast-dark";
  });
  readonly theme = computed(() => this.ctx.control("theme", this.dark() ? "Switch to light theme" : "Switch to dark theme"));

  toggle(): void {
    if (!this.ctx.attached() || this.theme().disabled) return;
    const next = this.dark() ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    this.ctx.store.viewer.setTheme(next);
  }
}
