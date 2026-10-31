import { button, type ElementFactory } from "./dom.js";
import type { HistoryEntry } from "./engine-types.js";

export interface HistoryActions {
  /** Restore the document to this history point. */
  restoreHistory(id: string): void;
  /** Drop this change (revert). */
  revertHistory(id: string): void;
  /** Hide this tray until the View menu shows it again. */
  hideTray?(): void;
}

/**
 * Track-changes history list. Choosing a row calls `restoreHistory`.
 * Revert drops that change. Does not open files or own scroll.
 */
export class HistoryPanel {
  readonly el: HTMLElement;
  private rendered = "";
  private currentId: string | null = null;

  constructor(
    private readonly h: ElementFactory,
    private readonly actions: HistoryActions,
  ) {
    this.el = h("aside", "dd-panel dd-history");
    this.el.setAttribute("aria-label", "Track changes");
  }

  render(entries: HistoryEntry[], currentId: string | null = null): void {
    const key = `${currentId ?? ""}\n${entries.map((entry) => `${entry.id}\t${entry.label}`).join("\n")}`;
    if (key === this.rendered && this.el.childElementCount) return;
    this.rendered = key;
    this.currentId = currentId;
    const heading = this.heading();
    if (!entries.length) {
      const empty = this.h("p", "dd-muted");
      empty.textContent = "No changes";
      this.el.replaceChildren(heading, empty);
      return;
    }
    this.el.replaceChildren(heading, ...entries.map((entry) => this.row(entry)));
  }

  private heading(): HTMLElement {
    const row = this.h("div", "dd-panel-heading");
    const title = this.h("h3");
    title.textContent = "Track changes";
    row.append(title);
    if (this.actions.hideTray) {
      const hide = button(this.h, "Hide", () => this.actions.hideTray?.(), "Hide track changes", "x");
      hide.dataset.action = "hide-tray";
      row.append(hide);
    }
    return row;
  }

  private row(entry: HistoryEntry): HTMLElement {
    const row = this.h("article", "dd-history-row");
    row.dataset.historyId = entry.id;
    if (entry.id === this.currentId) row.dataset.current = "true";
    const label = this.h("button", "dd-history-label");
    label.type = "button";
    label.textContent = entry.label || entry.id;
    label.addEventListener("click", () => this.actions.restoreHistory(entry.id));

    const revert = button(this.h, "Revert", () => this.actions.revertHistory(entry.id), "Revert this change");
    revert.dataset.action = "revert";

    row.append(label, revert);
    return row;
  }
}
