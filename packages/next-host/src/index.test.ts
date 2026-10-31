import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { DomdocViewer, loadDomdoc } from "./index.js";

it("is a client module that re-exports the React viewer", async () => {
  expect(readFileSync(resolve(process.cwd(), "src/index.ts"), "utf8").startsWith('"use client";')).toBe(true);
  expect(typeof DomdocViewer).toBe("function");
  expect(typeof (await loadDomdoc()).createViewer).toBe("function");
});
