import { cn } from "../lib/cn.js";

export type ButtonVariant = "default" | "outline" | "ghost" | "secondary";

export interface ButtonOptions {
  id?: string;
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

/** shadcn-style button (vanilla DOM — embeddable in any framework host). */
export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = options.id ?? "";
  btn.disabled = options.disabled ?? false;
  btn.textContent = options.label;
  btn.className = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
    options.variant === "outline" &&
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    options.variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
    options.variant === "secondary" && "bg-muted text-foreground hover:bg-muted/80",
    (!options.variant || options.variant === "default") &&
      "bg-primary text-primary-foreground hover:bg-primary/90",
    options.className,
  );
  if (options.onClick) btn.addEventListener("click", options.onClick);
  return btn;
}

export interface InputOptions {
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  className?: string;
  ariaLabel?: string;
  onInput?: (value: string) => void;
}

export function createInput(options: InputOptions): HTMLInputElement {
  const input = document.createElement("input");
  input.id = options.id ?? "";
  input.type = options.type ?? "text";
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.value != null) input.value = options.value;
  if (options.ariaLabel) input.setAttribute("aria-label", options.ariaLabel);
  input.className = cn(
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    options.className,
  );
  if (options.onInput) {
    input.addEventListener("input", () => options.onInput!(input.value));
  }
  return input;
}

export function createLabel(forId: string, text: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.htmlFor = forId;
  label.textContent = text;
  label.className = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
  return label;
}

export function createCard(title: string): { root: HTMLElement; body: HTMLElement } {
  const root = document.createElement("section");
  root.className = "rounded-lg border bg-card text-card-foreground shadow-sm";
  const header = document.createElement("div");
  header.className = "flex flex-col space-y-1.5 p-4 pb-2";
  const h = document.createElement("h2");
  h.className = "text-sm font-semibold tracking-tight";
  h.textContent = title;
  header.appendChild(h);
  const body = document.createElement("div");
  body.className = "p-4 pt-2 space-y-3";
  root.append(header, body);
  return { root, body };
}
