<script lang="ts">
  import { onMount, type Component } from "svelte";
  import type { ViewerOptions } from "@filedom/core";

  const bundlesBase = (import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "https://cdn.filedom.io/0.2.0").replace(/\/$/, "");
  const sampleUrl = "/sdk/docs/samples/hello.pdf";

  // Loaded after mount so adapter-static does not evaluate the viewer during the server build.
  let Shell = $state<Component | null>(null);
  let Bar = $state<Component | null>(null);
  let options = $state<ViewerOptions | null>(null);

  onMount(() => {
    let stopped = false;
    void (async () => {
      const [core, shell, toolbar] = await Promise.all([
        import("@filedom/core"),
        import("$lib/components/filedom/ViewerShell.svelte"),
        import("$lib/components/filedom/Toolbar.svelte"),
      ]);
      if (stopped) return;
      options = {
        bundles: core.bundlesFromCdn(bundlesBase),
        toolbar: false,
        fontsWasmBase: `${bundlesBase}/fonts/`,
      };
      Shell = shell.default;
      Bar = toolbar.default;
    })();
    return () => {
      stopped = true;
    };
  });
</script>

<svelte:head>
  <title>filedom · SvelteKit</title>
</svelte:head>

<main class="h-dvh">
  {#if Shell && Bar && options}
    <svelte:component this={Shell} {options} {sampleUrl}>
      <svelte:component this={Bar} />
    </svelte:component>
  {/if}
</main>
