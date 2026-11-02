<script lang="ts">
  import { Moon, Sun } from "lucide-svelte";
  import Button from "@/components/filedom/Button.svelte";
  import Tooltip from "@/components/filedom/Tooltip.svelte";
  import { control, getFiledom } from "@/components/filedom/FiledomProvider.svelte";

  const filedom = getFiledom();
  const snapshotStore = filedom.snapshot;
  const snapshot = $derived($snapshotStore);
  const theme = $derived(control(snapshot, "theme", "Theme"));
  const dark = $derived(snapshot?.theme === "dark" || snapshot?.theme === "high-contrast-dark");

  $effect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
  });

  function toggle() {
    if (theme.disabled) return;
    const next = dark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    filedom.viewer.setTheme(next);
  }
</script>

{#if !theme.hidden}
  <Tooltip text={theme.title}>
    <Button
      variant="icon"
      data-slot="theme-toggle"
      data-action="theme"
      aria-label="Theme"
      aria-pressed={dark}
      disabled={theme.disabled}
      title={theme.disabled ? theme.title : undefined}
      onclick={toggle}
    >
      {#if dark}
        <Sun class="size-4" />
      {:else}
        <Moon class="size-4" />
      {/if}
    </Button>
  </Tooltip>
{/if}
