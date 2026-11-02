"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn, plainClass, slotName } from "@/lib/cn";

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-background hover:bg-accent",
  ghost: "hover:bg-accent",
  icon: "size-8 px-0 hover:bg-accent",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
};

export function Button({ className, variant = "default", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      data-slot={slotName(props, "button")}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        VARIANTS[variant],
        plainClass(className),
      )}
    />
  );
}
