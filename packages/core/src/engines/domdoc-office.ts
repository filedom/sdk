import init, { initSync, open as openOffice } from "../../../../../domdoc-wasm/pkg/office/domdoc_office.js";
import type { EngineSession } from "../engine-types.js";

let ready: Promise<unknown> | undefined;

/** The domdoc office bundle. `office_oxide` is linked inside it. */
export default async function initOffice(): Promise<void> {
  if (!ready) {
    ready = boot().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
}

export function format(): string {
  return "office";
}

export function open(bytes: Uint8Array): EngineSession {
  return openOffice(bytes) as EngineSession;
}

async function boot(): Promise<unknown> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  if (runtime.process?.versions?.node) {
    // @ts-expect-error Node builtins are loaded only under Node; the package typecheck has no Node types.
    const { readFile } = await import("node:fs/promises");
    const wasm = await readFile(new URL("../../../../../domdoc-wasm/pkg/office/domdoc_office_bg.wasm", import.meta.url));
    return initSync({ module: wasm });
  }
  return init();
}
