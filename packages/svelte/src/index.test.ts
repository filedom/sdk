import { expect, it } from "vitest";
import { filedom, type Viewer } from "./index.js";

it("mounts on action create, remounts on new options and destroys", () => {
  const node = document.createElement("div");
  const seen: Viewer[] = [];
  const action = filedom(node, { options: { bundles: {} }, onReady: (v) => seen.push(v) });
  expect(node.querySelectorAll(".dd-viewer")).toHaveLength(1);
  action.update({ options: { bundles: {}, zoom: 2 }, onReady: (v) => seen.push(v) });
  expect(seen).toHaveLength(2);
  expect(seen[1]!.getZoom()).toBe(2);
  expect(node.querySelectorAll(".dd-viewer")).toHaveLength(1);
  action.destroy();
  expect(node.querySelector(".dd-viewer")).toBeNull();
});
