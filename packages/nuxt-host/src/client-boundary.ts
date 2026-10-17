/** M5: Nuxt client boundary stub — session id only; no SSR document state. */

export interface DomdocNuxtHostSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
  host: "nuxt-client-boundary-stub";
}

export interface DomdocNuxtHostClientBoundary {
  /** Nuxt client-only module hint for host wiring (not a runtime import). */
  clientModuleHint: "@domdoc/nuxt-host/client-boundary";
  sessionContext: DomdocNuxtHostSessionContext;
}

export function domdocNuxtHostAdapterDemoSurface(sessionId: string): DomdocNuxtHostSessionContext {
  return {
    sessionId,
    surface: "framework-adapter-stub",
    host: "nuxt-client-boundary-stub",
  };
}

export function resolveDomdocNuxtHostClientBoundary(sessionId: string): DomdocNuxtHostClientBoundary {
  return {
    clientModuleHint: "@domdoc/nuxt-host/client-boundary",
    sessionContext: domdocNuxtHostAdapterDemoSurface(sessionId),
  };
}
