import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Renders a `lucide` icon node (an array of `[tag, attrs]`) to an SVG string.
 * Astro builds the markup on the server, where `lucide`'s `createElement` has no document.
 */
export function lucideSvg(icon: unknown, className = "size-4"): string {
  const nodes = Array.isArray(icon) ? icon : [];
  const body = nodes
    .map((node) => {
      if (!Array.isArray(node) || typeof node[0] !== "string") return "";
      const attrs = node[1] && typeof node[1] === "object" ? (node[1] as Record<string, unknown>) : {};
      const list = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${escapeAttr(String(value))}"`)
        .join(" ");
      return `<${node[0]} ${list}></${node[0]}>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${escapeAttr(className)}" aria-hidden="true">${body}</svg>`;
}
