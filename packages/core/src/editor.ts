import type { ElementFactory } from "./dom.js";
import { LINE_BREAK, type CaretMove, type Pos } from "./engine-types.js";

export interface Selection {
  anchor: Pos;
  focus: Pos;
}

export const samePos = (a: Pos, b: Pos): boolean => a.unit === b.unit && a.offset === b.offset;
export const isCollapsed = (s: Selection): boolean => samePos(s.anchor, s.focus);

/** What the editor needs from the viewer. */
export interface EditorHost {
  document(): { span(a: Pos, b: Pos): { start: Pos; end: Pos } } | undefined;
  selection(): Selection | null;
  setSelection(selection: Selection, options?: { goalX?: number; reveal?: boolean }): void;
  /** Asks the core where the caret goes. The host only mirrors the result. */
  move(move: CaretMove, extend: boolean): void;
  goalX(): number | undefined;
  canEdit(): boolean;
  /** Replaces the selection with `text`; returns false when the engine refused. */
  insert(text: string): boolean | Promise<boolean>;
  /** Deletes the selection, or the character/word before (`-1`) or after (`1`) the caret. */
  delete(direction: 1 | -1, word: boolean): boolean;
  selectedText(): string;
  toggle(style: "bold" | "italic" | "underline"): void;
  selectAll(): void;
  undo(): void;
  redo(): void;
}

const isMac = (nav: Navigator | undefined) => /Mac|iPhone|iPad/.test(nav?.platform ?? nav?.userAgent ?? "");

/** Normalizes pasted text to the engine's breaks: newlines split paragraphs. */
export function normalizePaste(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * Keyboard, IME and clipboard input for the document. Input arrives in a hidden textarea
 * that sits at the caret (so IME candidate windows open next to it) and is never moved
 * between parents, so focus survives page changes.
 */
export class Editor {
  readonly input: HTMLTextAreaElement;
  private composing = false;
  private readonly mac: boolean;

  constructor(
    private readonly host: EditorHost,
    h: ElementFactory,
  ) {
    const input = h("textarea", "dd-input");
    input.setAttribute("aria-label", "Document text input");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.spellcheck = false;
    this.input = input;
    this.mac = isMac(input.ownerDocument.defaultView?.navigator);
    input.addEventListener("keydown", (e) => this.onKey(e));
    input.addEventListener("input", (e) => this.onInput(e as InputEvent));
    input.addEventListener("compositionstart", () => this.onCompositionStart());
    input.addEventListener("compositionend", (e) => this.onCompositionEnd(e));
    input.addEventListener("copy", (e) => this.onCopy(e));
    input.addEventListener("cut", (e) => this.onCut(e));
    input.addEventListener("paste", (e) => this.onPaste(e));
  }

  get isComposing(): boolean {
    return this.composing;
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  blur(): void {
    this.input.blur();
  }

  /** Moves the input to the caret: CSS pixels inside the scroll container. */
  place(leftPx: number, topPx: number, heightPx: number): void {
    const style = this.input.style;
    style.left = `${leftPx}px`;
    style.top = `${topPx}px`;
    style.height = `${heightPx}px`;
    style.fontSize = `${Math.max(heightPx / 1.2, 1)}px`;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.composing || e.isComposing || e.keyCode === 229) return;
    const mod = this.mac ? e.metaKey : e.ctrlKey;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const move = this.moveFor(e, mod);
    if (move) {
      e.preventDefault();
      this.move(move, e.shiftKey);
      return;
    }
    const handled = (): void => e.preventDefault();
    if (mod && !e.altKey) {
      switch (key) {
        case "z":
          handled();
          if (e.shiftKey) this.host.redo();
          else this.host.undo();
          return;
        case "y":
          handled();
          this.host.redo();
          return;
        case "a":
          handled();
          this.host.selectAll();
          return;
        case "b":
        case "i":
        case "u":
          handled();
          this.host.toggle(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
          return;
      }
      return;
    }
    switch (e.key) {
      case "Backspace":
      case "Delete":
        handled();
        if (this.host.canEdit()) this.host.delete(e.key === "Delete" ? 1 : -1, this.mac ? e.altKey : e.ctrlKey);
        return;
      case "Enter":
        handled();
        if (this.host.canEdit()) this.host.insert(e.shiftKey ? LINE_BREAK : "\n");
        return;
      // Tab is left to the browser so focus can reach the toolbar and the review panel.
      case "Escape": {
        const sel = this.host.selection();
        if (sel && !isCollapsed(sel)) {
          handled();
          this.host.setSelection({ anchor: sel.focus, focus: sel.focus });
        }
        return;
      }
    }
  }

  private moveFor(e: KeyboardEvent, mod: boolean): CaretMove | undefined {
    const word = this.mac ? e.altKey : e.ctrlKey;
    switch (e.key) {
      case "ArrowLeft":
        return this.mac && e.metaKey ? "lineStart" : word ? "wordLeft" : "left";
      case "ArrowRight":
        return this.mac && e.metaKey ? "lineEnd" : word ? "wordRight" : "right";
      case "ArrowUp":
        return this.mac && e.metaKey ? "docStart" : "up";
      case "ArrowDown":
        return this.mac && e.metaKey ? "docEnd" : "down";
      case "Home":
        return mod || e.ctrlKey ? "docStart" : "lineStart";
      case "End":
        return mod || e.ctrlKey ? "docEnd" : "lineEnd";
    }
    return undefined;
  }

  /** Moves or extends the caret. The core collapses a selection on a plain Left/Right. */
  move(move: CaretMove, extend: boolean): void {
    if (!this.host.document() || !this.host.selection()) return;
    this.host.move(move, extend);
  }

  private onInput(e: InputEvent): void {
    if (this.composing || e.isComposing) return;
    const text = this.input.value;
    this.input.value = "";
    if (text && this.host.canEdit()) void Promise.resolve(this.host.insert(normalizePaste(text)));
  }

  private onCompositionStart(): void {
    this.composing = true;
    this.input.classList.add("dd-composing");
  }

  private onCompositionEnd(e: CompositionEvent): void {
    this.composing = false;
    this.input.classList.remove("dd-composing");
    const text = e.data || this.input.value;
    this.input.value = "";
    if (text && this.host.canEdit()) void Promise.resolve(this.host.insert(text));
  }

  private onCopy(e: ClipboardEvent): void {
    const doc = this.input.ownerDocument;
    const selected = doc.getSelection();
    const node = selected?.anchorNode;
    const host = node instanceof Element ? node : node?.parentElement;
    const box = host?.closest<HTMLElement>(".dd-error, .dd-status");
    if (box && e.clipboardData && selected && !selected.isCollapsed) {
      const text = selected.toString() || box.dataset.message || box.querySelector("pre")?.textContent || box.textContent || "";
      if (text) {
        e.preventDefault();
        e.clipboardData.setData("text/plain", text);
        return;
      }
    }
    const text = this.host.selectedText();
    if (!text || !e.clipboardData) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", text.replaceAll(LINE_BREAK, "\n"));
  }

  private onCut(e: ClipboardEvent): void {
    this.onCopy(e);
    if (e.defaultPrevented && this.host.canEdit()) this.host.delete(-1, false);
  }

  private onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData("text/plain");
    e.preventDefault();
    if (text && this.host.canEdit()) this.host.insert(normalizePaste(text));
  }
}
