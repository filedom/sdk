import { expect, it } from "vitest";
import { createApp, h } from "vue";
import { DomdocViewer, type Viewer } from "./index.js";

it("mounts the core viewer, emits ready and destroys on unmount", () => {
  const container = document.createElement("div");
  let viewer: Viewer | undefined;
  const app = createApp({ render: () => h(DomdocViewer, { options: { bundles: {} }, onReady: (v: Viewer) => (viewer = v) }) });
  app.mount(container);
  expect(viewer).toBeDefined();
  expect(container.querySelector(".dd-viewer")).not.toBeNull();
  app.unmount();
  expect(container.querySelector(".dd-viewer")).toBeNull();
});
