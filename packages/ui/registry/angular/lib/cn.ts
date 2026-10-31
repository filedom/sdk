import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names, with Tailwind conflicts resolved by the later class. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
