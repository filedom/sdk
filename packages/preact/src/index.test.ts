import { h, render } from "preact";
import { act } from "preact/test-utils";
import { expect, it } from "vitest";
import { DomdocViewer, type Viewer } from "./index.js";

it("mounts the core viewer and destroys it on unmount", () => {
  const container = document.createElement("div");
  let viewer: Viewer | undefined;
  act(() => render(h(DomdocViewer, { options: { bundles: {} }, onReady: (v) => (viewer = v) }), container));
  expect(viewer).toBeDefined();
  expect(container.querySelector(".dd-viewer")).not.toBeNull();
  act(() => render(null, container));
  expect(container.querySelector(".dd-viewer")).toBeNull();
});
