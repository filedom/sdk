import { compileFromFile } from "json-schema-to-typescript";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(__dirname, "..");
const wasmSchemaDir = path.resolve(coreRoot, "../../../domdoc-wasm/schema");
const outDir = path.resolve(coreRoot, "src/wire");

const banner =
  "/* eslint-disable */\n/** Generated from domdoc-wasm/schema — do not edit by hand. */\n\n";

await mkdir(outDir, { recursive: true });

const projectionSchema = path.join(wasmSchemaDir, "render-wire-v1.json");
const responseSchema = path.join(wasmSchemaDir, "render-wire-response-v1.json");

await copyFile(projectionSchema, path.join(outDir, "render-wire-v1.schema.json"));
await copyFile(responseSchema, path.join(outDir, "render-wire-response-v1.schema.json"));

const projectionTs = await compileFromFile(projectionSchema, {
  bannerComment: banner,
  additionalProperties: false,
});
await writeFile(path.join(outDir, "generated-projection.ts"), projectionTs);

const responseTs = await compileFromFile(responseSchema, {
  bannerComment: banner,
  additionalProperties: false,
});
await writeFile(path.join(outDir, "generated-response.ts"), responseTs);

await writeFile(
  path.join(outDir, "generated.ts"),
  `${banner}export * from "./generated-projection.js";\nexport * from "./generated-response.js";\nexport const WIRE_SCHEMA_ID = "domdoc://render-wire/v1" as const;\nexport const WIRE_PROTOCOL_VERSION = 1 as const;\n`,
);

console.log("wire types generated in src/wire/");
