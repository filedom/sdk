import { ElementRef } from "@angular/core";
import { expect, it } from "vitest";
import { mountFiledomViewer } from "./index.js";

it("mounts into an ElementRef and destroys with the DestroyRef", () => {
  const element = document.createElement("div");
  const callbacks: Array<() => void> = [];
  const viewer = mountFiledomViewer(new ElementRef(element), { bundles: {} }, {
    onDestroy: (fn) => {
      callbacks.push(fn);
      return () => undefined;
    },
  });
  expect(viewer.files).toBeDefined();
  expect(element.querySelector(".dd-viewer")).not.toBeNull();
  callbacks.forEach((fn) => fn());
  expect(element.querySelector(".dd-viewer")).toBeNull();
});
