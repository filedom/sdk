/** M5: SvelteKit client boundary stub — session id only; no SSR document state. */

export interface DomdocSvelteKitHostSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
  host: "sveltekit-client-boundary-stub";
}

export interface DomdocSvelteKitHostClientBoundary {
  clientModuleHint: "@domdoc/sveltekit-host/client-boundary";
  sessionContext: DomdocSvelteKitHostSessionContext;
}

export function domdocSvelteKitHostAdapterDemoSurface(
  sessionId: string,
): DomdocSvelteKitHostSessionContext {
  return {
    sessionId,
    surface: "framework-adapter-stub",
    host: "sveltekit-client-boundary-stub",
  };
}

export function resolveDomdocSvelteKitHostClientBoundary(
  sessionId: string,
): DomdocSvelteKitHostClientBoundary {
  return {
    clientModuleHint: "@domdoc/sveltekit-host/client-boundary",
    sessionContext: domdocSvelteKitHostAdapterDemoSurface(sessionId),
  };
}
