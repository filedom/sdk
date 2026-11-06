import { Show } from "solid-js";
import { Moon, Sun } from "lucide-solid";
import { Button } from "@/components/filedom/button";
import { useAction, useFiledom } from "@/components/filedom/filedom-provider";
import { Tooltip } from "@/components/filedom/tooltip";

export function ThemeToggle() {
  const api = useFiledom();
  const theme = useAction("theme", "Theme");
  const dark = () => {
    const value = api.snapshot()?.theme;
    return value === "dark";
  };

  function toggle() {
    const next = dark() ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    api.store()?.viewer.setTheme(next);
  }

  return (
    <Show when={!theme().hidden}>
      <Tooltip label={dark() ? "Light theme" : "Dark theme"}>
        <Button
          variant="icon"
          data-slot="theme-toggle"
          data-action="theme"
          disabled={theme().disabled}
          title={theme().disabled ? theme().title : dark() ? "Light theme" : "Dark theme"}
          aria-label="Theme"
          onClick={toggle}
        >
          <Show when={dark()} fallback={<Moon size={16} />}>
            <Sun size={16} />
          </Show>
        </Button>
      </Tooltip>
    </Show>
  );
}
