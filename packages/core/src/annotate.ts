import { button, type ElementFactory } from "./dom.js";
import type { Pos, UnitRange } from "./engine-types.js";

/** A highlight applied to a passage. `color: null` clears it. */
export interface HighlightEvent {
  color: string | null;
  text: string;
  ranges: UnitRange[];
  anchor: Pos;
  focus: Pos;
}

/** A comment attached to a highlighted passage. */
export interface Annotation {
  id: string;
  text: string;
  /** The passage the comment is attached to. */
  quote: string;
  ranges: UnitRange[];
  anchor: Pos;
  focus: Pos;
}

/** Carets at the two ends of `ranges`, in document order. */
export function passageEnds(ranges: UnitRange[]): { anchor: Pos; focus: Pos } | undefined {
  const first = ranges.find((range) => range.end > range.start);
  const last = [...ranges].reverse().find((range) => range.end > range.start);
  if (!first || !last) return undefined;
  return {
    anchor: { unit: first.unit, offset: first.start },
    focus: { unit: last.unit, offset: last.end },
  };
}

/** Visible text of `ranges`, one line per unit. A missing unit contributes nothing. */
export function quoteFromRanges(ranges: UnitRange[], unitText: (unit: string) => string): string {
  return ranges
    .filter((range) => range.end > range.start)
    .map((range) => {
      try {
        return Array.from(unitText(range.unit)).slice(range.start, range.end).join("");
      } catch {
        return "";
      }
    })
    .filter((text) => text.length > 0)
    .join("\n");
}

export interface SelectionMenuActions {
  highlight(): void;
  addComment(text: string): void;
}

/**
 * Highlight and comment controls that sit on a text selection.
 * The same bar is used for PDF and Office files.
 */
export class SelectionMenu {
  readonly el: HTMLDivElement;
  private readonly actionsRow: HTMLDivElement;
  private readonly form: HTMLFormElement;
  private readonly area: HTMLTextAreaElement;

  constructor(
    h: ElementFactory,
    private readonly actions: SelectionMenuActions,
  ) {
    const bar = h("div", "dd-abs dd-menu");
    bar.hidden = true;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Selection");
    bar.addEventListener("mousedown", (event) => {
      if ((event.target as Element | null)?.closest("textarea")) return;
      event.preventDefault();
    });
    bar.addEventListener("pointerdown", (event) => event.stopPropagation());
    bar.addEventListener("click", (event) => event.stopPropagation());

    const row = h("div", "dd-menu-actions");
    const highlight = button(h, "Highlight", () => actions.highlight(), "Highlight", "highlight");
    highlight.dataset.action = "highlight";
    const comment = button(h, "Comment", () => this.showComposer(), "Comment", "comment");
    comment.dataset.action = "comment";
    row.append(highlight, comment);

    const form = h("form", "dd-menu-form");
    form.hidden = true;
    const area = h("textarea");
    area.rows = 3;
    area.required = true;
    area.placeholder = "Add a comment";
    area.setAttribute("aria-label", "Comment");
    const buttons = h("div", "dd-menu-actions");
    const add = h("button");
    add.type = "submit";
    add.textContent = "Add comment";
    const cancel = h("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => this.hideComposer());
    buttons.append(add, cancel);
    form.append(area, buttons);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = area.value.trim();
      if (!text) return;
      area.value = "";
      this.hideComposer();
      actions.addComment(text);
    });
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.hideComposer();
    });

    bar.append(row, form);
    this.el = bar;
    this.actionsRow = row;
    this.form = form;
    this.area = area;
  }

  get composing(): boolean {
    return !this.form.hidden;
  }

  /** Shows or hides the bar. Hiding also closes the comment field. */
  setOpen(open: boolean): void {
    if (!open) this.hideComposer();
    this.el.hidden = !open;
  }

  showComposer(): void {
    this.el.hidden = false;
    this.actionsRow.hidden = true;
    this.form.hidden = false;
    this.area.focus();
  }

  hideComposer(): void {
    this.form.hidden = true;
    this.actionsRow.hidden = false;
    this.area.value = "";
  }
}

/** The comment text for a marker on the page. */
export class AnnotationCard {
  readonly el: HTMLDivElement;
  private readonly quote: HTMLParagraphElement;
  private readonly body: HTMLParagraphElement;

  constructor(h: ElementFactory) {
    const card = h("div", "dd-abs dd-note-card");
    card.hidden = true;
    card.setAttribute("role", "note");
    card.addEventListener("pointerdown", (event) => event.stopPropagation());
    card.addEventListener("mousedown", (event) => event.stopPropagation());
    const quote = h("p", "dd-muted");
    const body = h("p");
    card.append(quote, body);
    this.el = card;
    this.quote = quote;
    this.body = body;
  }

  show(note: Annotation | undefined): void {
    if (!note) {
      this.el.hidden = true;
      this.quote.textContent = "";
      this.body.textContent = "";
      return;
    }
    this.quote.textContent = note.quote;
    this.body.textContent = note.text;
    this.el.hidden = false;
  }
}
