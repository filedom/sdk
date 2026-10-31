<script lang="ts">
  import { bundlesFromCdn, type ViewerOptions } from "@domdoc/core";
  import Toolbar from "@/components/domdoc/Toolbar.svelte";
  import ViewerShell from "@/components/domdoc/ViewerShell.svelte";

  const bundles = bundlesFromCdn(import.meta.env.DOMDOC_EXAMPLES_BUNDLES || "/api/bundles/0.0.1/");
  const options: ViewerOptions = { bundles, toolbar: false };
</script>

<main class="h-dvh">
  <ViewerShell {options} sampleUrl="/sdk-docs/samples/hello.pdf">
    <Toolbar />
  </ViewerShell>
</main>
