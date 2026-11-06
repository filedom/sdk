import type { ViewerStoreSnapshot } from "@filedom/core";
import { createElement, Moon, Sun } from "lucide";
import { LitElement, html } from "lit";
import { button } from "@/components/filedom/button";
import { actionState, filedomProvider, watchFiledom } from "@/components/filedom/filedom-provider";
import { tooltip } from "@/components/filedom/tooltip";

function icon(node: Parameters<typeof createElement>[0]) {
  return createElement(node, { class: "size-4", "aria-hidden": "true" });
}

export class FiledomThemeToggleElement extends LitElement {
  private snapshot: ViewerStoreSnapshot | null = null;
  private stop = () => {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stop = watchFiledom(this, (snapshot) => {
      this.snapshot = snapshot;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.stop();
    super.disconnectedCallback();
  }

  private dark(): boolean {
    const theme = this.snapshot?.theme;
    return theme === "dark";
  }

  private toggle = () => {
    const next = this.dark() ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    filedomProvider(this)?.store?.viewer.setTheme(next);
  };

  override render() {
    const theme = actionState(this.snapshot, "theme", "Theme");
    const label = this.dark() ? "Light theme" : "Dark theme";
    return tooltip(
      theme.disabled ? theme.title : label,
      button({
        variant: "icon",
        slot: "theme-toggle",
        action: "theme",
        hidden: theme.hidden,
        disabled: theme.disabled,
        title: theme.disabled ? theme.title : label,
        ariaLabel: "Theme",
        label: icon(this.dark() ? Sun : Moon),
        onClick: this.toggle,
      }),
    );
  }
}

if (!customElements.get("filedom-theme-toggle")) customElements.define("filedom-theme-toggle", FiledomThemeToggleElement);
