/** M5: Next.js App Router client boundary stub — session id only; no RSC document state. */

export interface DomdocNextHostSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
  host: "next-app-router-client-boundary-stub";
}

export interface DomdocNextHostClientBoundary {
  /** `"use client"` module id placeholder for host wiring (not a runtime import). */
  clientModuleHint: "@domdoc/next-host/client-boundary";
  sessionContext: DomdocNextHostSessionContext;
}

export function domdocNextHostAdapterDemoSurface(sessionId: string): DomdocNextHostSessionContext {
  return {
    sessionId,
    surface: "framework-adapter-stub",
    host: "next-app-router-client-boundary-stub",
  };
}

/** Host manifest parity: Next shell receives the same session id as other framework stubs. */
export function resolveDomdocNextHostClientBoundary(sessionId: string): DomdocNextHostClientBoundary {
  return {
    clientModuleHint: "@domdoc/next-host/client-boundary",
    sessionContext: domdocNextHostAdapterDemoSurface(sessionId),
  };
}
