<script lang="ts">
  import { bundlesFromCdn, type ViewerOptions } from "@filedom/core";
  import Toolbar from "@/components/filedom/Toolbar.svelte";
  import ViewerShell from "@/components/filedom/ViewerShell.svelte";

  const bundles = bundlesFromCdn(import.meta.env.FILEDOM_EXAMPLES_BUNDLES || "https://cdn.filedom.io/0.2.0/");
  const options: ViewerOptions = { bundles, toolbar: false };
</script>

<main class="h-dvh">
  <ViewerShell {options} sampleUrl="/sdk-docs/samples/hello.pdf">
    <Toolbar />
  </ViewerShell>
</main>
