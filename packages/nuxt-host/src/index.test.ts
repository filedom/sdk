import { expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { FiledomClientViewer } from "./index.js";

it("lazy-loads the Vue viewer on the client", async () => {
  const container = document.createElement("div");
  const app = createApp({ render: () => h(FiledomClientViewer, { options: { bundles: {} } }) });
  app.mount(container);
  await import("@filedom/vue");
  await vi.waitFor(
    async () => {
      await nextTick();
      expect(container.querySelector(".dd-viewer")).not.toBeNull();
    },
    { timeout: 10_000, interval: 10 },
  );
  app.unmount();
});
