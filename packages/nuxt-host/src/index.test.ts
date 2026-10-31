import { expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { DomdocClientViewer } from "./index.js";

it("lazy-loads the Vue viewer on the client", async () => {
  const container = document.createElement("div");
  const app = createApp({ render: () => h(DomdocClientViewer, { options: { bundles: {} } }) });
  app.mount(container);
  for (let i = 0; i < 10 && !container.querySelector(".dd-viewer"); i++) {
    await new Promise((r) => setTimeout(r, 10));
    await nextTick();
  }
  expect(container.querySelector(".dd-viewer")).not.toBeNull();
  app.unmount();
});
