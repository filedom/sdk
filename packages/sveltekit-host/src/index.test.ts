import { expect, it } from "vitest";
import { domdocClient } from "./index.js";

it("imports the SDK lazily and mounts after the import resolves", async () => {
  const node = document.createElement("div");
  const action = domdocClient(node, { options: { bundles: {} } });
  expect(node.querySelector(".dd-viewer")).toBeNull();
  await action.ready;
  expect(node.querySelector(".dd-viewer")).not.toBeNull();
  action.destroy();
  expect(node.querySelector(".dd-viewer")).toBeNull();
});
