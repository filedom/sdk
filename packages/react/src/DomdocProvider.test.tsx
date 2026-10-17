import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DomdocProvider,
  domdocReactAdapterDemoSurface,
  useDomdocSession,
} from "./DomdocProvider.js";

function SessionLabel() {
  const { sessionId, surface } = useDomdocSession();
  return (
    <span data-testid="session">
      {sessionId}:{surface}
    </span>
  );
}

describe("@domdoc/react framework adapter stub (M5)", () => {
  it("provides session context through DomdocProvider", () => {
    render(
      <DomdocProvider sessionId="demo-sess">
        <SessionLabel />
      </DomdocProvider>,
    );
    expect(screen.getByTestId("session").textContent).toBe("demo-sess:framework-adapter-stub");
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocReactAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });
});
