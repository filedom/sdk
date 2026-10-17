/** M5: Astro client boundary stub — session id only; no SSR document state. */

export interface DomdocAstroHostSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
  host: "astro-client-boundary-stub";
}

export interface DomdocAstroHostClientBoundary {
  /** Astro client:component / island hint for host wiring (not a runtime import). */
  clientModuleHint: "@domdoc/astro-host/client-boundary";
  sessionContext: DomdocAstroHostSessionContext;
}

export function domdocAstroHostAdapterDemoSurface(sessionId: string): DomdocAstroHostSessionContext {
  return {
    sessionId,
    surface: "framework-adapter-stub",
    host: "astro-client-boundary-stub",
  };
}

export function resolveDomdocAstroHostClientBoundary(sessionId: string): DomdocAstroHostClientBoundary {
  return {
    clientModuleHint: "@domdoc/astro-host/client-boundary",
    sessionContext: domdocAstroHostAdapterDemoSurface(sessionId),
  };
}
