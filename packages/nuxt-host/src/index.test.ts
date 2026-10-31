import { expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { DomdocClientViewer } from "./index.js";

it("lazy-loads the Vue viewer on the client", async () => {
  const container = document.createElement("div");
  const app = createApp({ render: () => h(DomdocClientViewer, { options: { bundles: {} } }) });
  app.mount(container);
  await import("@domdoc/vue");
  await vi.waitFor(
    async () => {
      await nextTick();
      expect(container.querySelector(".dd-viewer")).not.toBeNull();
    },
    { timeout: 10_000, interval: 10 },
  );
  app.unmount();
});
