import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/domdoc/button";
import { useAction, useDomdoc } from "@/components/domdoc/domdoc-provider";
import { Tooltip } from "@/components/domdoc/tooltip";

function isDark(theme: string | undefined): boolean {
  return theme === "dark" || theme === "high-contrast-dark";
}

export function ThemeToggle() {
  const { store, snapshot } = useDomdoc();
  const action = useAction("theme");
  const dark = isDark(snapshot?.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (action.hidden) return null;

  return (
    <Tooltip label={action.title ?? (dark ? "Light theme" : "Dark theme")}>
      <Button
        variant="icon"
        data-slot="theme-toggle"
        data-action="theme"
        disabled={action.disabled}
        title={action.title ?? (dark ? "Light theme" : "Dark theme")}
        aria-label={dark ? "Light theme" : "Dark theme"}
        onClick={() => {
          if (!store || action.disabled) return;
          const next = dark ? "light" : "dark";
          document.documentElement.classList.toggle("dark", next === "dark");
          store.viewer.setTheme(next);
        }}
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </Tooltip>
  );
}
