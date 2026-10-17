#!/usr/bin/env node
/**
 * G2-LAYOUT-08: record shaped≠flow visual diff artifacts (JSON snapshots).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G2-feasibility");
mkdirSync(outDir, { recursive: true });

const flowEntry = join(root, "..", "domdoc-wasm", "pkg-node", "domdoc_engine.js");
const parleyEntry = join(root, "..", "domdoc-wasm", "pkg-node-parley", "domdoc_engine.js");

const VISUAL_CORPUS = [
  { id: "LV-01", text: "ffi fl ligature probe words flow wrap boundary", max_width_pt: 64, font_size_pt: 12 },
  { id: "LV-02", text: "The quick brown fox jumps over the lazy dog repeatedly", max_width_pt: 72, font_size_pt: 12 },
  { id: "LV-03", text: "Domdoc Sans Fallback shaping metadata on each line", max_width_pt: 88, font_size_pt: 11 },
];

function lineSnapshot(shapedJson) {
  const lines = JSON.parse(shapedJson);
  return lines.map((l) => ({
    text: l.text,
    width_pt: l.width_pt,
    height_pt: l.height_pt,
    shaping_backend: l.shaping_backend ?? null,
    primary_font_family: l.primary_font_family ?? null,
  }));
}

const record = {
  recordedAt: new Date().toISOString(),
  status: "not-run",
  entries: [],
  note: "G2-LAYOUT-08 JSON snapshots; gate G2 not-run until visual baselines reviewed.",
};

if (existsSync(flowEntry) && existsSync(parleyEntry)) {
  const flow = await import(pathToFileURL(flowEntry).href);
  const parley = await import(pathToFileURL(parleyEntry).href);
  record.status = "recorded-json-snapshots";
  for (const entry of VISUAL_CORPUS) {
    const payload = JSON.stringify({
      paragraph_id: entry.id,
      text: entry.text,
      max_width_pt: entry.max_width_pt,
      font_size_pt: entry.font_size_pt,
    });
    const flowJson = String(flow.layout_flow_paragraph_shaped_json(payload));
    const parleyJson = String(parley.layout_flow_paragraph_shaped_json(payload));
    const flowLines = lineSnapshot(flowJson);
    const parleyLines = lineSnapshot(parleyJson);
    record.entries.push({
      corpusId: entry.id,
      flowBackend: String(flow.layout_shaping_backend_id()),
      parleyBackend: String(parley.layout_shaping_backend_id()),
      jsonEqual: flowJson === parleyJson,
      lineBreakEqual: flowLines.map((l) => l.text).join("|") === parleyLines.map((l) => l.text).join("|"),
      flowLines,
      parleyLines,
    });
  }
} else {
  record.status = "wasm-pkg-missing-not-run";
  record.missing = {
    flowEntry: existsSync(flowEntry),
    parleyEntry: existsSync(parleyEntry),
  };
}

writeFileSync(
  join(outDir, "layout-shaped-flow-visual-diff.json"),
  `${JSON.stringify(record, null, 2)}\n`,
);
console.log(`[record-layout-visual-diff] ${record.status} (${record.entries.length} entries)`);
