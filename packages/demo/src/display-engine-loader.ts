/** Lazy display-engine WASM (domdoc-wasm pkg) — not pulled into empty viewer graphs. */

export type DisplayEngineModule = typeof import("@domdoc/demo-engine");

let modulePromise: Promise<DisplayEngineModule> | null = null;

export async function loadDisplayEngineModule(): Promise<DisplayEngineModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const mod = await import("@domdoc/demo-engine");
      await mod.default();
      return mod;
    })();
  }
  return modulePromise;
}

export function resetDisplayEngineLoaderForTests(): void {
  modulePromise = null;
}
