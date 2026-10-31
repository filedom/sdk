#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { FRAMEWORKS, FRAMEWORK_REGISTRY_SET, PROJECT_CONFIG, type FrameworkId } from "./contracts.js";
import { validateJson, type JsonSchema } from "./json-schema.js";
import {
  cssCandidates,
  defaultConfig,
  detectFramework,
  installCommand,
  libDir,
  missingPackages,
  readPackageJson,
  THEME_IMPORT,
  withThemeImport,
  type ProjectConfig,
} from "./project.js";
import { PACKAGE_ROOT, readRegistry, resolveItems, rewriteAliases, withUseClient } from "./registry.js";

export interface CliIo {
  /** Directory `--cwd` is resolved against. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Directory holding `registry.json` and `registry/`. Defaults to this package. */
  registryRoot?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
}

const USAGE = `Usage: domdoc <command> [options]

Commands:
  init                 Detect the framework, write domdoc.json, and import the theme in your CSS
  add <items...>       Copy registry items and the items they depend on into componentDir

Options:
  --cwd <dir>          Project root (default: current directory)
  --dry-run            Print what would change without writing
  --overwrite          Replace existing files (add) or an existing domdoc.json (init)
  --framework <id>     init only: skip detection (${FRAMEWORKS.join(", ")})
  -h, --help           Show this help
`;

class CliError extends Error {}

interface Options {
  positionals: string[];
  cwd?: string;
  framework?: string;
  dryRun: boolean;
  overwrite: boolean;
  help: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { positionals: [], dryRun: false, overwrite: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    const value = () => {
      const next = inline ?? argv[++i];
      if (next === undefined || next === "") throw new CliError(`${flag} needs a value`);
      return next;
    };
    if (flag === "--cwd") options.cwd = value();
    else if (flag === "--framework") options.framework = value();
    else if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--overwrite") options.overwrite = true;
    else if (flag === "-h" || flag === "--help") options.help = true;
    else if (arg.startsWith("-")) throw new CliError(`unknown option ${arg}`);
    else options.positionals.push(arg);
  }
  return options;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new CliError(`cannot read ${path}: ${(error as Error).message}`);
  }
}
const projectSchema = () => readJson(join(PACKAGE_ROOT, "schema/domdoc.schema.json")) as JsonSchema;

function checkConfig(config: unknown, label: string): ProjectConfig {
  const errors = validateJson(projectSchema(), config);
  if (errors.length) throw new CliError(`${label} is invalid:\n  ${errors.join("\n  ")}`);
  return config as ProjectConfig;
}

/** Joins `child` under `base`, refusing paths that leave it. */
function inside(base: string, child: string): string {
  const path = resolve(base, child);
  if (path !== base && !path.startsWith(base + sep)) throw new CliError(`${child} leaves ${base}`);
  return path;
}

class Writer {
  constructor(
    private readonly cwd: string,
    private readonly dryRun: boolean,
    private readonly out: (text: string) => void,
  ) {}

  show(path: string): string {
    return relative(this.cwd, path).split(sep).join("/") || ".";
  }

  write(path: string, content: string, verb: "create" | "update" | "overwrite"): void {
    const done = { create: "created", update: "updated", overwrite: "overwrote" }[verb];
    this.out(`${this.dryRun ? `would ${verb}` : done} ${this.show(path)}\n`);
    if (this.dryRun) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

function init(options: Options, cwd: string, out: (text: string) => void): void {
  const pkg = readPackageJson(cwd);
  if (!pkg) throw new CliError(`no package.json in ${cwd}. Run domdoc init in your project root or pass --cwd.`);
  const writer = new Writer(cwd, options.dryRun, out);
  const configPath = join(cwd, PROJECT_CONFIG);

  let config: ProjectConfig;
  if (existsSync(configPath) && !options.overwrite) {
    config = checkConfig(readJson(configPath), PROJECT_CONFIG);
    out(`kept ${PROJECT_CONFIG} (framework ${config.framework}); pass --overwrite to replace it\n`);
  } else {
    let framework: FrameworkId | null;
    if (options.framework !== undefined) {
      if (!(FRAMEWORKS as readonly string[]).includes(options.framework)) {
        throw new CliError(`unknown framework ${options.framework}. Use one of: ${FRAMEWORKS.join(", ")}`);
      }
      framework = options.framework as FrameworkId;
    } else {
      framework = detectFramework(pkg);
      if (!framework) {
        throw new CliError(`could not detect a framework from package.json. Pass --framework <${FRAMEWORKS.join("|")}>.`);
      }
      out(`detected ${framework}\n`);
    }
    const candidates = cssCandidates(framework, cwd);
    const css = candidates.find((path) => existsSync(join(cwd, path))) ?? candidates[0];
    const { $schema, componentDir, aliases } = defaultConfig(framework, cwd);
    config = checkConfig({ $schema, framework, componentDir, css, aliases }, PROJECT_CONFIG);
    writer.write(configPath, `${JSON.stringify(config, null, 2)}\n`, existsSync(configPath) ? "overwrite" : "create");
  }

  const cssPath = inside(cwd, config.css);
  if (existsSync(cssPath)) {
    const next = withThemeImport(readFileSync(cssPath, "utf8"));
    if (next === null) out(`${config.css} already imports @domdoc/ui/theme.css\n`);
    else writer.write(cssPath, next, "update");
  } else {
    writer.write(cssPath, `@import "tailwindcss";\n${THEME_IMPORT}\n`, "create");
  }

  const missing = missingPackages(pkg, ["@domdoc/ui", "tailwindcss"]);
  if (missing.length) out(`\nInstall the packages the theme needs:\n  ${installCommand(cwd, missing)}\n`);
  out(`\nImports in copied files use ${config.aliases.components} and ${config.aliases.lib}; make sure your bundler resolves them.\n`);
}

function add(options: Options, cwd: string, registryRoot: string, out: (text: string) => void): void {
  if (!options.positionals.length) throw new CliError("name at least one item: domdoc add <items...>");
  const configPath = join(cwd, PROJECT_CONFIG);
  if (!existsSync(configPath)) throw new CliError(`no ${PROJECT_CONFIG} in ${cwd}. Run domdoc init first.`);
  const config = checkConfig(readJson(configPath), PROJECT_CONFIG);
  const set = FRAMEWORK_REGISTRY_SET[config.framework];

  let items;
  try {
    items = resolveItems(readRegistry(registryRoot), options.positionals);
  } catch (error) {
    throw new CliError((error as Error).message);
  }

  const componentDir = inside(cwd, config.componentDir);
  const planned: { item: string; path: string; content: string }[] = [];
  const npm: string[] = [];
  for (const item of items) {
    const files = item.files[set];
    if (!files?.length) throw new CliError(`${item.name} has no ${set} files in the registry`);
    const base = item.type === "lib" ? inside(cwd, libDir(config)) : componentDir;
    for (const file of files) {
      const source = join(registryRoot, file.path);
      if (!existsSync(source)) throw new CliError(`registry file ${file.path} for ${item.name} is missing`);
      let content = rewriteAliases(readFileSync(source, "utf8"), config.aliases);
      if (config.framework === "next" && item.type !== "lib" && /\.[jt]sx?$/.test(file.target)) content = withUseClient(content);
      planned.push({ item: item.name, path: inside(base, file.target), content });
    }
    npm.push(...(item.dependencies?.[set] ?? []));
  }

  out(`adding ${items.map((item) => item.name).join(", ")} (${set} set)\n`);
  const writer = new Writer(cwd, options.dryRun, out);
  const skipped: string[] = [];
  for (const file of planned) {
    if (!existsSync(file.path)) {
      writer.write(file.path, file.content, "create");
    } else if (readFileSync(file.path, "utf8") === file.content) {
      out(`unchanged ${writer.show(file.path)}\n`);
    } else if (options.overwrite) {
      writer.write(file.path, file.content, "overwrite");
    } else {
      skipped.push(writer.show(file.path));
      out(`skipped ${writer.show(file.path)} (exists)\n`);
    }
  }
  if (skipped.length) out(`\n${skipped.length} existing file${skipped.length > 1 ? "s were" : " was"} kept. Pass --overwrite to replace.\n`);

  const missing = missingPackages(readPackageJson(cwd), npm);
  if (missing.length) out(`\nMissing npm packages:\n  ${installCommand(cwd, missing)}\n`);
}

/** Runs the CLI and returns the exit code. */
export function run(argv: readonly string[], io: CliIo = {}): number {
  const out = io.stdout ?? ((text: string) => process.stdout.write(text));
  const err = io.stderr ?? ((text: string) => process.stderr.write(text));
  try {
    const options = parseArgs(argv);
    const [command, ...rest] = options.positionals;
    if (options.help || !command || command === "help") {
      out(USAGE);
      return options.help || command === "help" ? 0 : 1;
    }
    options.positionals = rest;
    const base = io.cwd ?? process.cwd();
    const cwd = options.cwd ? (isAbsolute(options.cwd) ? options.cwd : resolve(base, options.cwd)) : base;
    if (options.dryRun) out("dry run: nothing is written\n");
    if (command === "init") init(options, cwd, out);
    else if (command === "add") add(options, cwd, io.registryRoot ?? PACKAGE_ROOT, out);
    else throw new CliError(`unknown command ${command}\n\n${USAGE}`);
    return 0;
  } catch (error) {
    if (!(error instanceof CliError) && !(error instanceof SyntaxError)) throw error;
    err(`domdoc: ${error.message}\n`);
    return 1;
  }
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) process.exitCode = run(process.argv.slice(2));
