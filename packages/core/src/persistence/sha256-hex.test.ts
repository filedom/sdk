import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256-hex.js";

describe("isomorphic sha256Hex", () => {
  it("matches node:crypto for UTF-8 checkpoint bytes", () => {
    const bytes = new TextEncoder().encode("checkpoint");
    expect(sha256Hex(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
});
