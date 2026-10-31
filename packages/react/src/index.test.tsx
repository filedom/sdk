import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { DomdocViewer, type Viewer } from "./index.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("mounts the core viewer and destroys it on unmount", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let viewer: Viewer | undefined;
  const options = { bundles: {} };
  await act(async () => root.render(<DomdocViewer options={options} onReady={(v) => (viewer = v)} />));
  expect(viewer).toBeDefined();
  expect(container.querySelector(".dd-viewer")).not.toBeNull();
  await act(async () => root.unmount());
  expect(container.querySelector(".dd-viewer")).toBeNull();
});
