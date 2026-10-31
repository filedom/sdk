import { Component, Input } from "@angular/core";
import { cn } from "@/lib/cn";

@Component({
  selector: "domdoc-separator",
  standalone: true,
  template: "",
  host: {
    "data-slot": "separator",
    role: "separator",
    "[attr.aria-orientation]": "orientation",
    "[class]": "hostClass",
  },
})
export class DomdocSeparator {
  @Input() orientation: "horizontal" | "vertical" = "horizontal";

  get hostClass(): string {
    return cn("shrink-0 bg-border", this.orientation === "vertical" ? "mx-0.5 h-5 w-px" : "my-1 h-px w-full");
  }
}
