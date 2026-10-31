<script lang="ts">
  import { Moon, Sun } from "lucide-svelte";
  import Button from "@/components/domdoc/Button.svelte";
  import Tooltip from "@/components/domdoc/Tooltip.svelte";
  import { control, getDomdoc } from "@/components/domdoc/DomdocProvider.svelte";

  const domdoc = getDomdoc();
  const snapshotStore = domdoc.snapshot;
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
    domdoc.viewer.setTheme(next);
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
