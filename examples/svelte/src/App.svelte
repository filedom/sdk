<script lang="ts">
  import { bundlesFromCdn, type ViewerOptions } from "@filedom/core";
  import Toolbar from "@/components/filedom/Toolbar.svelte";
  import ViewerShell from "@/components/filedom/ViewerShell.svelte";

  const bundlesBase = (import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "https://cdn.filedom.io/0.2.0").replace(/\/$/, "");
  const options: ViewerOptions = {
    bundles: bundlesFromCdn(bundlesBase),
    toolbar: false,
    fontsWasmBase: `${bundlesBase}/fonts/`,
  };
</script>

<main class="h-dvh">
  <ViewerShell {options} sampleUrl="/sdk/docs/samples/hello.pdf">
    <Toolbar />
  </ViewerShell>
</main>
