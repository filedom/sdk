import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Keeps a string class. Preact also types `className` as a signal, which `cn` cannot merge. */
export function plainClass(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** A block's `data-slot` replaces the primitive's default. */
export function slotName(props: object, fallback: string): string {
  const value = (props as { "data-slot"?: unknown })["data-slot"];
  return typeof value === "string" ? value : fallback;
}
