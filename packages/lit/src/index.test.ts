import { expect, it } from "vitest";
import "./index.js";

it("creates the viewer when options are set and destroys it when removed", async () => {
  const el = document.createElement("filedom-viewer");
  const ready = new Promise<CustomEvent>((resolve) => el.addEventListener("filedom-ready", (e) => resolve(e as CustomEvent)));
  document.body.append(el);
  el.options = { bundles: {} };
  const event = await ready;
  expect(event.detail).toBe(el.viewer);
  expect(el.querySelector(".dd-viewer")).not.toBeNull();
  el.remove();
  expect(el.querySelector(".dd-viewer")).toBeNull();
});
