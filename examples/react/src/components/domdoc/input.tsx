import type { InputHTMLAttributes } from "react";
import { cn, plainClass, slotName } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      data-slot={slotName(props, "input")}
      className={cn(
        "h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        plainClass(className),
      )}
    />
  );
}
