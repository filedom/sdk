import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import type { FrameworkId } from "./contracts.js";
import { packageName } from "./registry.js";

export interface ProjectConfig {
  $schema?: string;
  framework: FrameworkId;
  componentDir: string;
  css: string;
  aliases: { components: string; lib: string };
}

export const PROJECT_SCHEMA_URL = "https://domdoc.io/sdk-docs/schema/domdoc.schema.json";

export const THEME_IMPORT = '@import "@domdoc/ui/theme.css";';

type PackageJson = Partial<Record<"dependencies" | "devDependencies" | "peerDependencies", Record<string, string>>>;

export function readPackageJson(cwd: string): PackageJson | null {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
}

/** Every package name the project declares, in any dependency field. */
export function declaredPackages(pkg: PackageJson | null): Set<string> {
  return new Set(
    [pkg?.dependencies, pkg?.devDependencies, pkg?.peerDependencies].flatMap((deps) => Object.keys(deps ?? {})),
  );
}

/**
 * Detection order. Meta-frameworks come before the library they build on (Next before
 * React, SvelteKit before Svelte), and Astro first because its islands pull in others.
 */
const DETECT: readonly [string, FrameworkId][] = [
  ["astro", "astro"],
  ["next", "next"],
  ["nuxt", "nuxt"],
  ["@sveltejs/kit", "sveltekit"],
  ["@angular/core", "angular"],
  ["solid-js", "solid"],
  ["preact", "preact"],
  ["svelte", "svelte"],
  ["vue", "vue"],
  ["lit", "lit"],
  ["react", "react"],
];

export function detectFramework(pkg: PackageJson | null): FrameworkId | null {
  const deps = declaredPackages(pkg);
  return DETECT.find(([name]) => deps.has(name))?.[1] ?? null;
}

/** Stylesheets `init` looks for, in order. The first is created when none exists. */
export function cssCandidates(framework: FrameworkId, cwd: string): string[] {
  switch (framework) {
    case "next":
      return existsSync(join(cwd, "src/app"))
        ? ["src/app/globals.css", "app/globals.css", "src/styles/globals.css", "styles/globals.css"]
        : ["app/globals.css", "src/app/globals.css", "styles/globals.css", "src/styles/globals.css"];
    case "nuxt":
      return existsSync(join(cwd, "app"))
        ? ["app/assets/css/main.css", "assets/css/main.css"]
        : ["assets/css/main.css", "app/assets/css/main.css"];
    case "sveltekit":
      return ["src/app.css"];
    case "angular":
      return ["src/styles.css"];
    case "astro":
      return ["src/styles/global.css", "src/styles/globals.css"];
    default:
      return ["src/index.css", "src/style.css", "src/styles.css", "src/app.css", "src/main.css", "src/App.css", "src/global.css"];
  }
}

export function defaultConfig(framework: FrameworkId, cwd: string): Omit<ProjectConfig, "css"> {
  const base = { $schema: PROJECT_SCHEMA_URL, framework };
  switch (framework) {
    case "next":
      return existsSync(join(cwd, "src"))
        ? { ...base, componentDir: "src/components/domdoc", aliases: { components: "@/components/domdoc", lib: "@/lib" } }
        : { ...base, componentDir: "components/domdoc", aliases: { components: "@/components/domdoc", lib: "@/lib" } };
    case "nuxt":
      return {
        ...base,
        componentDir: existsSync(join(cwd, "app")) ? "app/components/domdoc" : "components/domdoc",
        aliases: { components: "~/components/domdoc", lib: "~/lib" },
      };
    case "sveltekit":
      return { ...base, componentDir: "src/lib/components/domdoc", aliases: { components: "$lib/components/domdoc", lib: "$lib" } };
    case "angular":
      return { ...base, componentDir: "src/app/components/domdoc", aliases: { components: "@/components/domdoc", lib: "@/lib" } };
    default:
      return { ...base, componentDir: "src/components/domdoc", aliases: { components: "@/components/domdoc", lib: "@/lib" } };
  }
}

const segments = (path: string) => posix.normalize(path.replace(/\\/g, "/")).split("/").filter((s) => s && s !== ".");

/**
 * The directory `aliases.lib` points at. `domdoc.json` has no lib directory, so it is
 * derived from `componentDir` and `aliases.components`: their shared tail gives the
 * alias root (`@/components/domdoc` in `src/components/domdoc` means `@` is `src`).
 */
export function libDir(config: ProjectConfig): string {
  const dir = segments(config.componentDir);
  const alias = config.aliases.components.split("/").filter(Boolean);
  let shared = 0;
  while (shared < dir.length && shared < alias.length && dir[dir.length - 1 - shared] === alias[alias.length - 1 - shared]) {
    shared += 1;
  }
  const aliasRoot = alias.slice(0, alias.length - shared);
  const dirRoot = dir.slice(0, dir.length - shared);
  const lib = config.aliases.lib.split("/").filter(Boolean);
  if (shared === 0 || aliasRoot.length === 0 || aliasRoot.some((part, i) => lib[i] !== part)) {
    throw new Error(
      `cannot place aliases.lib "${config.aliases.lib}": it must share a root with aliases.components "${config.aliases.components}", ` +
        `whose tail must match componentDir "${config.componentDir}"`,
    );
  }
  return [...dirRoot, ...lib.slice(aliasRoot.length)].join("/") || ".";
}

/** Specs from `wanted` whose package the project does not declare yet. */
export function missingPackages(pkg: PackageJson | null, wanted: Iterable<string>): string[] {
  const declared = declaredPackages(pkg);
  const out: string[] = [];
  for (const spec of wanted) {
    if (!declared.has(packageName(spec)) && !out.includes(spec)) out.push(spec);
  }
  return out;
}

export function installCommand(cwd: string, specs: readonly string[]): string {
  const has = (file: string) => existsSync(join(cwd, file));
  const tool = has("pnpm-lock.yaml")
    ? "pnpm add"
    : has("yarn.lock")
      ? "yarn add"
      : has("bun.lockb") || has("bun.lock")
        ? "bun add"
        : "npm install";
  return `${tool} ${specs.join(" ")}`;
}

/**
 * `css` with the theme import added once: after `@import "tailwindcss"` when present,
 * otherwise first (after `@charset`). Returns null when it is already there.
 */
export function withThemeImport(css: string): string | null {
  if (/@import\s+(url\()?["']@domdoc\/ui\/theme\.css["']/.test(css)) return null;
  const tailwind = /^[ \t]*@import\s+["']tailwindcss["'][^;\n]*;[ \t]*\r?\n?/m.exec(css);
  if (tailwind) {
    const end = tailwind.index + tailwind[0].length;
    const sep = tailwind[0].endsWith("\n") ? "" : "\n";
    return `${css.slice(0, end)}${sep}${THEME_IMPORT}\n${css.slice(end)}`;
  }
  const charset = /^@charset\s+[^;]+;\s*\r?\n?/.exec(css);
  const at = charset ? charset[0].length : 0;
  return `${css.slice(0, at)}${THEME_IMPORT}\n${css.slice(at)}`;
}
