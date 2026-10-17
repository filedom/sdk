import { describe, expect, it } from "vitest";
import { DomdocSessionHost, domdocLitAdapterDemoSurface } from "./domdoc-session-host.js";

describe("@domdoc/lit framework adapter stub (M5)", () => {
  it("exposes session context on domdoc-session-host", () => {
    const el = new DomdocSessionHost();
    el.sessionId = "demo-sess";
    expect(el.sessionContext).toEqual({
      sessionId: "demo-sess",
      surface: "framework-adapter-stub",
    });
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    expect(domdocLitAdapterDemoSurface("demo-sess").surface).toBe("framework-adapter-stub");
  });
});
