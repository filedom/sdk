import { parentPort } from "node:worker_threads";
import {
  tryLoadPdfiumLibProbeRenderNode,
  tryRenderPdfiumLibProbePageBitmapNode,
} from "./pdfium-lib-probe-render-node.js";

if (!parentPort) {
  throw new Error("pdfium-lib-probe-render-worker must run as a worker thread");
}

parentPort.on("message", async (msg: { type: string }) => {
  try {
    if (msg.type === "pdfium-probe/init") {
      const status = await tryLoadPdfiumLibProbeRenderNode();
      parentPort?.postMessage({
        ok: true,
        body: {
          moduleLoaded: status.moduleLoaded,
          renderOnly: status.renderOnly,
          probePresent: status.probePresent,
          error: status.error ?? null,
        },
      });
      return;
    }
    if (msg.type === "pdfium-probe/render-page") {
      const bitmap = await tryRenderPdfiumLibProbePageBitmapNode();
      parentPort?.postMessage({ ok: true, body: { bitmap } });
      return;
    }
    parentPort?.postMessage({ ok: false, error: "unknown pdfium-probe message" });
  } catch (err) {
    parentPort?.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
