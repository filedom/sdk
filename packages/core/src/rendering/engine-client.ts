import type { RenderWireResponse } from "../wire/generated.js";
import {
  WIRE_PROTOCOL_VERSION,
  WIRE_SCHEMA_ID,
} from "../wire/generated.js";
import type { DomdocRenderWireProtocolV1 as RenderProjection } from "../wire/generated-projection.js";

export type { RenderProjection };

export interface EngineClientOptions {
  /** When set, use a worker thread; otherwise call WASM in-process (tests/dev). */
  workerScript?: URL;
  workerOptions?: import("node:worker_threads").WorkerOptions;
}

export interface EngineClient {
  render(projection: RenderProjection): Promise<RenderWireResponse>;
  dispose(): Promise<void>;
}

export async function createEngineClient(
  options: EngineClientOptions = {},
): Promise<EngineClient> {
  if (options.workerScript) {
    return createWorkerClient(options.workerScript, options.workerOptions);
  }
  return createDirectClient();
}

async function createDirectClient(): Promise<EngineClient> {
  const wasm = await import("domdoc-wasm");

  return {
    async render(projection) {
      assertProjectionHeader(projection);
      const json = JSON.stringify(projection);
      const out = wasm.render_projection_json(json);
      return JSON.parse(out) as RenderWireResponse;
    },
    async dispose() {
      /* WASM module lifetime is process-scoped for W0. */
    },
  };
}

async function createWorkerClient(
  workerScript: URL,
  workerOptions?: import("node:worker_threads").WorkerOptions,
): Promise<EngineClient> {
  const { Worker } = await import("node:worker_threads");
  const worker = new Worker(workerScript, {
    ...workerOptions,
    type: "module",
  } as import("node:worker_threads").WorkerOptions);

  return {
    render(projection) {
      assertProjectionHeader(projection);
      return new Promise((resolve, reject) => {
        const onMessage = (
          msg:
            | { ok: true; body: RenderWireResponse }
            | { ok: false; error: string },
        ) => {
          worker.off("message", onMessage);
          worker.off("error", onError);
          if (msg.ok) resolve(msg.body);
          else reject(new Error(msg.error));
        };
        const onError = (err: Error) => {
          worker.off("message", onMessage);
          reject(err);
        };
        worker.on("message", onMessage);
        worker.on("error", onError);
        worker.postMessage({ type: "render", projection });
      });
    },
    async dispose() {
      await worker.terminate();
    },
  };
}

function assertProjectionHeader(projection: RenderProjection): void {
  if (projection.header.protocolVersion !== WIRE_PROTOCOL_VERSION) {
    throw new Error("protocol version mismatch");
  }
  if (projection.header.schemaId !== WIRE_SCHEMA_ID) {
    throw new Error("schema id mismatch");
  }
}
