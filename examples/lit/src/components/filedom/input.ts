import { html, nothing, type TemplateResult } from "lit";
import { cn } from "@/lib/cn";

export function textInput(options: {
  slot?: string;
  action?: string;
  class?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  hidden?: boolean;
  title?: string;
  ariaLabel?: string;
  onInput?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
} = {}): TemplateResult {
  if (options.hidden) return html`${nothing}`;
  const slot = options.slot ?? "input";
  const shared = {
    slot,
    action: options.action,
    type: options.type ?? "text",
    className: cn(
      "h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
      options.class,
    ),
    placeholder: options.placeholder,
    disabled: options.disabled === true,
    title: options.title,
    ariaLabel: options.ariaLabel,
    onInput: options.onInput,
    onKeyDown: options.onKeyDown,
  };
  // Omit `.value` unless the caller is controlling it. Search keeps the DOM value
  // and only copies the snapshot in when the field is not focused.
  if (options.value === undefined) {
    return html`<input
      data-slot=${shared.slot}
      data-action=${shared.action ?? nothing}
      type=${shared.type}
      class=${shared.className}
      placeholder=${shared.placeholder ?? nothing}
      ?disabled=${shared.disabled}
      title=${shared.title || nothing}
      aria-label=${shared.ariaLabel ?? nothing}
      @input=${shared.onInput}
      @keydown=${shared.onKeyDown}
    />`;
  }
  return html`<input
    data-slot=${shared.slot}
    data-action=${shared.action ?? nothing}
    type=${shared.type}
    class=${shared.className}
    placeholder=${shared.placeholder ?? nothing}
    .value=${options.value}
    ?disabled=${shared.disabled}
    title=${shared.title || nothing}
    aria-label=${shared.ariaLabel ?? nothing}
    @input=${shared.onInput}
    @keydown=${shared.onKeyDown}
  />`;
}
