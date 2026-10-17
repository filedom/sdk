import { FormatModuleLoader } from "../../core/dist/loading/format-module-loader.js";
import { loadDisplayEngineModule } from "./display-engine-loader.js";

/** Demo host registrations for logical format modules (implementation update §3). */
export const demoFormatModuleLoader = new FormatModuleLoader();

demoFormatModuleLoader.register("docx-adapter", () => loadDisplayEngineModule());

demoFormatModuleLoader.register("pdf-display", () =>
  import("./pdf-canvas-preview.js").then((m) => m),
);

demoFormatModuleLoader.register("legacy-doc-importer", () =>
  import("../../core/dist/formats/doc/legacy-doc-import-stub.js").then((m) => m),
);

export function syncFormatModuleDataset(): void {
  const loaded = demoFormatModuleLoader
    .snapshot()
    .filter((r) => r.status === "loaded")
    .map((r) => r.id)
    .join(",");
  document.body.dataset.aoFormatModulesLoaded = loaded || "";
}
