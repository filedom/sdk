import { expect, it } from "vitest";
import { mountDomdocIsland } from "./index.js";

it("mounts by selector and rejects missing targets", async () => {
  document.body.innerHTML = `<div id="doc"></div>`;
  const viewer = await mountDomdocIsland("#doc", { bundles: {} });
  expect(document.querySelector("#doc .dd-viewer")).not.toBeNull();
  viewer.destroy();
  await expect(mountDomdocIsland("#missing", { bundles: {} })).rejects.toThrow("not found");
});
