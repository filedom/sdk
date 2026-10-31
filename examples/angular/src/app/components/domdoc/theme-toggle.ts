import { Component, computed, inject } from "@angular/core";
import { LucideAngularModule, Moon, Sun } from "lucide-angular";
import { DomdocButton } from "@/components/domdoc/button";
import { DomdocContext } from "@/components/domdoc/domdoc-provider";
import { DomdocTooltip } from "@/components/domdoc/tooltip";

@Component({
  selector: "domdoc-theme-toggle",
  standalone: true,
  imports: [DomdocButton, DomdocTooltip, LucideAngularModule],
  template: `
    @if (!theme().hidden) {
      <domdoc-tooltip [text]="theme().title">
        <button
          domdocButton
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
      </domdoc-tooltip>
    }
  `,
})
export class DomdocThemeToggle {
  private readonly ctx = inject(DomdocContext);
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
