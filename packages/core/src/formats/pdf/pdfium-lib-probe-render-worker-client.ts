export interface PdfiumLibProbeWorkerStatus {
  moduleLoaded: boolean;
  renderOnly: boolean;
  probePresent: boolean;
  error: string | null;
}

export async function renderPdfiumLibProbePageViaWorker(
  workerScript: URL,
  workerOptions?: import("node:worker_threads").WorkerOptions,
): Promise<import("./pdfium-lib-probe-render-node.js").PdfiumLibProbePageBitmapResult> {
  const { Worker } = await import("node:worker_threads");
  const worker = new Worker(workerScript, {
    ...workerOptions,
    type: "module",
  } as import("node:worker_threads").WorkerOptions);
  try {
    return await new Promise((resolve, reject) => {
      worker.once("message", (msg: { ok: boolean; body?: { bitmap: import("./pdfium-lib-probe-render-node.js").PdfiumLibProbePageBitmapResult }; error?: string }) => {
        if (!msg.ok || !msg.body?.bitmap) {
          reject(new Error(msg.error ?? "pdfium-probe render-page failed"));
          return;
        }
        resolve(msg.body.bitmap);
      });
      worker.postMessage({ type: "pdfium-probe/render-page" });
    });
  } finally {
    await worker.terminate();
  }
}

export async function loadPdfiumLibProbeViaWorker(
  workerScript: URL,
  workerOptions?: import("node:worker_threads").WorkerOptions,
): Promise<PdfiumLibProbeWorkerStatus> {
  const { Worker } = await import("node:worker_threads");
  const worker = new Worker(workerScript, {
    ...workerOptions,
    type: "module",
  } as import("node:worker_threads").WorkerOptions);
  try {
    const status = await new Promise<PdfiumLibProbeWorkerStatus>((resolve, reject) => {
      worker.once("message", (msg: { ok: boolean; body?: PdfiumLibProbeWorkerStatus; error?: string }) => {
        if (!msg.ok || !msg.body) {
          reject(new Error(msg.error ?? "pdfium-probe worker failed"));
          return;
        }
        resolve(msg.body);
      });
      worker.postMessage({ type: "pdfium-probe/init" });
    });
    return status;
  } finally {
    await worker.terminate();
  }
}
