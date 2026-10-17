export interface PdfiumLibProbeWorkerStatus {
  moduleLoaded: boolean;
  renderOnly: boolean;
  probePresent: boolean;
  error: string | null;
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
