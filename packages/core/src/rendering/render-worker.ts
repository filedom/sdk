import { parentPort } from "node:worker_threads";
import type { RenderWireResponse } from "../wire/generated.js";
import { normalizeRenderWireResponse } from "../wire/normalize-render-wire-response.js";
import type { DomdocRenderWireProtocolV1 as RenderProjection } from "../wire/generated-projection.js";

if (!parentPort) {
  throw new Error("render-worker must run as a worker thread");
}

const wasm = await import("domdoc-wasm");

parentPort.on(
  "message",
  (msg: { type: "render"; projection: RenderProjection }) => {
    if (msg.type !== "render") {
      parentPort?.postMessage({ ok: false, error: "unknown message" });
      return;
    }
    try {
      const json = JSON.stringify(msg.projection);
      const out = wasm.render_projection_json(json);
      const body = normalizeRenderWireResponse(JSON.parse(out) as RenderWireResponse);
      parentPort?.postMessage({ ok: true, body });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      parentPort?.postMessage({ ok: false, error });
    }
  },
);
