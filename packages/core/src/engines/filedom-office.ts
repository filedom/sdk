import init, { initSync, open as openOffice } from "../../../../../wasm/pkg/office/filedom_office.js";
import type { EngineSession } from "../engine-types.js";

let ready: Promise<unknown> | undefined;

/** The filedom office bundle. `office_oxide` is linked inside it. */
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
    const wasm = await readFile(new URL("../../../../../wasm/pkg/office/filedom_office_bg.wasm", import.meta.url));
    return initSync({ module: wasm });
  }
  // pkg/ has no package.json, so NodeNext reads the glue typings as CommonJS and types the default import as the namespace.
  return (init as unknown as () => Promise<unknown>)();
}
