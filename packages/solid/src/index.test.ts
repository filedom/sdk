import { createRoot } from "solid-js";
import { expect, it } from "vitest";
import { FiledomViewer, type Viewer } from "./index.js";

it("mounts the core viewer in a reactive root and destroys it on dispose", async () => {
  let viewer: Viewer | undefined;
  const { host, dispose } = createRoot((dispose) => ({
    host: FiledomViewer({ options: { bundles: {} }, onReady: (v) => (viewer = v) }),
    dispose,
  }));
  await Promise.resolve();
  expect(viewer).toBeDefined();
  expect(host.querySelector(".dd-viewer")).not.toBeNull();
  dispose();
  expect(host.querySelector(".dd-viewer")).toBeNull();
});
