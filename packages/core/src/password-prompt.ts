import type { ElementFactory } from "./dom.js";
import type { Format } from "./engine-types.js";

export interface PasswordHint {
  code: "pdf-encrypted" | "doc-encrypted";
  format: Format;
  name: string;
  /** Zero on the first prompt; increments after each wrong password. */
  attempt: number;
}

/**
 * Modal password field for encrypted PDFs. Resolves with the entered password,
 * or `null` when the user cancels (Escape, Cancel, or backdrop click).
 */
export function promptForPassword(
  h: ElementFactory,
  host: HTMLElement,
  hint: PasswordHint,
): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = h("div", "dd-password-backdrop");
    const dialog = h("div", "dd-password");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      hint.format === "pdf" ? "PDF password" : "Document password",
    );

    const title = h("h2");
    title.textContent = hint.format === "pdf" ? "Password required" : "Encrypted document";

    const lead = h("p");
    lead.textContent =
      hint.attempt > 0
        ? "That password did not open the file. Try again."
        : "This file is password-protected. Enter the password to open it.";

    const name = h("p", "dd-muted");
    name.textContent = hint.name;

    const field = h("input");
    field.type = "password";
    field.autocomplete = "current-password";
    field.placeholder = "Password";
    field.setAttribute("aria-label", "Password");

    const actions = h("div", "dd-password-actions");
    const cancel = h("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    const open = h("button");
    open.type = "button";
    open.textContent = "Open";
    open.className = "dd-primary";
    actions.append(cancel, open);

    dialog.append(title, lead, name, field, actions);
    backdrop.append(dialog);
    host.append(backdrop);

    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      backdrop.remove();
      resolve(value);
    };

    cancel.addEventListener("click", () => finish(null));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(null);
    });
    open.addEventListener("click", () => finish(field.value));
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(field.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      }
    });

    field.focus();
  });
}
