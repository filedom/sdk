export interface DomdocSvelteSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

export const DOMDOC_SVELTE_CONTEXT_KEY = "domdoc-svelte-session";

export function createDomdocSvelteSessionContext(sessionId: string): DomdocSvelteSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}

export function domdocSvelteAdapterDemoSurface(sessionId: string): DomdocSvelteSessionContext {
  return createDomdocSvelteSessionContext(sessionId);
}
