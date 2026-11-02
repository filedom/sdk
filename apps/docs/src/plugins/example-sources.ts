/**
 * Reads examples/<fw>/filedom-example.json at build time and publishes the
 * manifest plus the integration files it lists. A framework with no manifest
 * is skipped. A manifest that names a missing file fails the build.
 */
import { createRequire } from "node:module";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import type { LoadContext, Plugin } from "@docusaurus/types";

type JsonSchema = { readonly [keyword: string]: unknown };

interface UiModule {
  FRAMEWORKS: readonly string[];
  EXAMPLE_MANIFEST: string;
  validateJson: (schema: JsonSchema, value: unknown) => string[];
}

interface LoadedUi {
  frameworks: readonly string[];
  manifestName: string;
  schema: JsonSchema;
  validateJson: UiModule["validateJson"];
}

export const EXAMPLE_SOURCES_PLUGIN_NAME = "filedom-example-sources";

const FILE_ROLES = ["page", "css", "config"] as const;

export type ExampleFileRole = (typeof FILE_ROLES)[number];

export interface ExampleSourceFile {
  path: string;
  role: ExampleFileRole;
  label: string;
  language: string;
  code: string;
}

export interface ExampleSource {
  framework: string;
  label: string;
  /** Manifest path, relative to the example directory. */
  logo: string;
  /** SVG document from that path. */
  logoSvg: string;
  install: string;
  add: string;
  files: ExampleSourceFile[];
}

export interface ExampleSourcesData {
  examples: ExampleSource[];
}

interface ExampleManifestFile {
  path: string;
  role: ExampleFileRole;
  label?: string;
  language?: string;
}

interface ExampleManifest {
  framework: string;
  label: string;
  logo: string;
  install: string;
  add: string;
  files: ExampleManifestFile[];
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  vue: "markup",
  svelte: "markup",
  astro: "markup",
  html: "markup",
  css: "css",
  scss: "css",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  sh: "bash",
  bash: "bash",
  yml: "yaml",
  yaml: "yaml",
  svg: "markup",
};

export function defaultExamplesDir(siteDir: string): string {
  return path.resolve(siteDir, "..", "..", "examples");
}

export function loadExampleSources(siteDir: string, examplesDir = defaultExamplesDir(siteDir)): ExampleSourcesData {
  const ui = loadUi(siteDir);
  const examples: ExampleSource[] = [];
  for (const framework of ui.frameworks) {
    const example = readExample(examplesDir, framework, ui);
    if (example) examples.push(example);
  }
  return { examples };
}

// Docusaurus loads plugins inside a vm and with jiti, which rewrites imports to require().
// @filedom/ui is ESM-only, so the contract values are read from its built files.
function loadUi(siteDir: string): LoadedUi {
  const require = createRequire(path.join(siteDir, "package.json"));
  const schemaPath = require.resolve("@filedom/ui/schema/filedom-example.schema.json");
  const packageRoot = path.resolve(path.dirname(schemaPath), "..");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
  const contracts = evaluateModule(path.join(packageRoot, "dist", "contracts.js"), ["FRAMEWORKS", "EXAMPLE_MANIFEST"]);
  const checker = evaluateModule(path.join(packageRoot, "dist", "json-schema.js"), ["validateJson"]);
  return {
    frameworks: contracts.FRAMEWORKS as readonly string[],
    manifestName: contracts.EXAMPLE_MANIFEST as string,
    schema,
    validateJson: checker.validateJson as LoadedUi["validateJson"],
  };
}

function evaluateModule(file: string, names: string[]): Record<string, unknown> {
  const source = readFileSync(file, "utf8").replace(/^export /gm, "");
  return new Function(`${source}\nreturn { ${names.join(", ")} };`)() as Record<string, unknown>;
}

export default function exampleSourcesPlugin(context: LoadContext): Plugin {
  return {
    name: EXAMPLE_SOURCES_PLUGIN_NAME,
    async loadContent(): Promise<ExampleSourcesData> {
      const content = loadExampleSources(context.siteDir);
      const names = content.examples.map((example) => example.framework);
      console.log(`[filedom-example-sources] ${names.length} manifest${names.length === 1 ? "" : "s"}: ${names.join(", ") || "none"}`);
      return content;
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
}

function readExample(examplesDir: string, framework: string, ui: LoadedUi): ExampleSource | undefined {
  const manifestPath = path.join(examplesDir, framework, ui.manifestName);
  const manifestStat = statIfExists(manifestPath);
  if (!manifestStat) return undefined;
  const where = manifestLabel(framework, ui.manifestName);
  if (!manifestStat.isFile()) throw new Error(`${where} is not a file`);

  const parsed = parseManifest(where, readFileSync(manifestPath, "utf8"));
  const errors = ui.validateJson(ui.schema, parsed);
  if (errors.length > 0) {
    throw new Error(`${where} does not match the example schema:\n${errors.map((error) => `  ${error}`).join("\n")}`);
  }
  const manifest = parsed as ExampleManifest;
  if (manifest.framework !== framework) {
    throw new Error(`${where} framework is "${manifest.framework}" and must equal "${framework}"`);
  }

  const exampleDir = path.join(examplesDir, framework);
  const seen = new Set<string>();
  const files = manifest.files.map((file) => {
    const relativePath = normalizeRelative(file.path, `${where} lists ${JSON.stringify(file.path)}`);
    if (seen.has(relativePath)) throw new Error(`${where} lists "${relativePath}" more than once`);
    seen.add(relativePath);
    const code = readListedFile(exampleDir, relativePath, `${where} lists "${relativePath}", but that file`);
    return {
      path: relativePath,
      role: file.role,
      label: file.label?.trim() || relativePath.split("/").pop() || relativePath,
      language: file.language?.trim() || languageFor(relativePath),
      code,
    };
  });

  const logo = normalizeRelative(manifest.logo, `${where} names logo ${JSON.stringify(manifest.logo)}`);
  const logoSvg = readListedFile(exampleDir, logo, `${where} names logo "${logo}", but that file`);

  return {
    framework,
    label: manifest.label,
    logo,
    logoSvg,
    install: manifest.install,
    add: manifest.add,
    files,
  };
}

function manifestLabel(framework: string, manifestName: string): string {
  return `examples/${framework}/${manifestName}`;
}

function parseManifest(where: string, text: string): unknown {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, "")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${where} is not valid JSON: ${detail}`);
  }
}

function languageFor(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXTENSION[extension] ?? "text";
}

function normalizeRelative(rel: string, described: string): string {
  if (rel.includes("\0")) throw new Error(`${described} is not a usable path`);
  const parts: string[] = [];
  for (const part of rel.split(/[\\/]+/)) {
    if (part === "" || part === ".") continue;
    if (part === "..") throw new Error(`${described}, which is outside the example directory`);
    parts.push(part);
  }
  if (parts.length === 0) throw new Error(`${described} is not a usable path`);
  return parts.join("/");
}

function readListedFile(exampleDir: string, relativePath: string, described: string): string {
  const absolutePath = path.resolve(exampleDir, ...relativePath.split("/"));
  let realRoot: string;
  let realFile: string;
  try {
    realRoot = realpathSync(exampleDir);
    realFile = realpathSync(absolutePath);
  } catch (error) {
    if (isEnoent(error)) throw new Error(`${described} does not exist`);
    throw error;
  }
  const fromRoot = path.relative(realRoot, realFile);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    throw new Error(`${described} is outside the example directory`);
  }
  if (!statSync(realFile).isFile()) throw new Error(`${described} does not exist`);
  return readFileSync(realFile, "utf8").replace(/^\uFEFF/, "");
}

function statIfExists(file: string): ReturnType<typeof statSync> | undefined {
  try {
    return statSync(file);
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
}

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
