import { button, type ElementFactory } from "./dom.js";
import type { Pos, RevisionView } from "./engine-types.js";

export interface ReviewActions {
  accept(id: string): void;
  reject(id: string): void;
  reveal(pos: Pos): void;
}

/** Change history for the track-changes view, with per-change accept and reject. */
export class ReviewPanel {
  readonly el: HTMLElement;
  private rendered = "";

  constructor(
    private readonly h: ElementFactory,
    private readonly actions: ReviewActions,
  ) {
    this.el = h("aside", "dd-panel");
    this.el.setAttribute("aria-label", "Change history");
  }

  render(revisions: RevisionView[]): void {
    const key = revisions.map((rev) => `${rev.id}\t${rev.kind}\t${rev.inserted}\t${rev.deleted}\t${rev.date}`).join("\n");
    if (key === this.rendered && this.el.childElementCount) return;
    this.rendered = key;
    const heading = this.h("h3");
    heading.textContent = "Change history";
    const cards = revisions.map((rev) => this.card(rev));
    if (!cards.length) {
      const empty = this.h("p", "dd-muted");
      empty.textContent = "No changes";
      this.el.replaceChildren(heading, empty);
      return;
    }
    this.el.replaceChildren(heading, ...cards);
  }

  private card(rev: RevisionView): HTMLElement {
    const card = this.h("article", "dd-rev");
    const meta = this.h("small");
    meta.textContent = [rev.author, rev.kind, rev.date].filter(Boolean).join(" · ");
    const deleted = rev.deleted;
    const inserted = rev.inserted;
    const body = this.h("p");
    if (deleted) body.append(Object.assign(this.h("del"), { textContent: deleted }));
    if (deleted && inserted) body.append(" ");
    if (inserted) body.append(Object.assign(this.h("ins"), { textContent: inserted }));
    const accept = button(this.h, "Accept", () => this.actions.accept(rev.id), "Accept", "check");
    accept.dataset.action = "accept";
    const reject = button(this.h, "Reject", () => this.actions.reject(rev.id), "Reject", "x");
    reject.dataset.action = "reject";
    card.append(meta, body, accept, reject);
    card.addEventListener("click", (event) => {
      if ((event.target as Element | null)?.closest("button")) return;
      this.actions.reveal({ unit: rev.unit, offset: 0 });
    });
    return card;
  }
}
