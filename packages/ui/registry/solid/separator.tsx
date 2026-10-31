import { cn } from "@/lib/cn";

export function Separator(props: { orientation?: "horizontal" | "vertical"; class?: string }) {
  const vertical = () => props.orientation === "vertical";
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={vertical() ? "vertical" : "horizontal"}
      class={cn("shrink-0 bg-border", vertical() ? "mx-1 h-5 w-px" : "my-1 h-px w-full", props.class)}
    />
  );
}
