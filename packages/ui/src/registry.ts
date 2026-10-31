import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegistrySetId } from "./contracts.js";

export interface RegistryFile {
  path: string;
  target: string;
}

export interface RegistryItem {
  name: string;
  type: "lib" | "primitive" | "block";
  description?: string;
  slots?: string[];
  registryDependencies?: string[];
  files: Partial<Record<RegistrySetId, RegistryFile[]>>;
  dependencies?: Partial<Record<RegistrySetId, string[]>>;
}

export interface Registry {
  $schema?: string;
  name: "domdoc";
  items: RegistryItem[];
}

/** `packages/ui`, from `src/` under vitest and from `dist/` once built. */
export const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));

export function readRegistry(root: string = PACKAGE_ROOT): Registry {
  return JSON.parse(readFileSync(join(root, "registry.json"), "utf8")) as Registry;
}

/**
 * Import specifiers the registry sources are written with. `domdoc add` replaces them
 * with `aliases.components` and `aliases.lib` from the project's `domdoc.json`.
 */
export const REGISTRY_ALIASES = { components: "@/components/domdoc", lib: "@/lib" } as const;

/**
 * The named items and everything they need, dependencies first, each once.
 * Throws on an unknown name or a dependency cycle.
 */
export function resolveItems(registry: Registry, names: readonly string[]): RegistryItem[] {
  const byName = new Map(registry.items.map((item) => [item.name, item]));
  const unknown = names.filter((name) => !byName.has(name));
  if (unknown.length) {
    throw new Error(`unknown item${unknown.length > 1 ? "s" : ""} ${unknown.join(", ")}. Available: ${[...byName.keys()].join(", ")}`);
  }
  const done = new Set<string>();
  const visiting: string[] = [];
  const order: RegistryItem[] = [];
  const visit = (name: string) => {
    if (done.has(name)) return;
    if (visiting.includes(name)) throw new Error(`registry dependency cycle: ${[...visiting, name].join(" -> ")}`);
    const item = byName.get(name);
    if (!item) throw new Error(`${visiting.at(-1)} depends on unknown item ${name}`);
    visiting.push(name);
    for (const dep of item.registryDependencies ?? []) visit(dep);
    visiting.pop();
    done.add(name);
    order.push(item);
  };
  for (const name of names) visit(name);
  return order;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Rewrites quoted specifiers that start with a registry alias to the project's alias. */
export function rewriteAliases(source: string, aliases: { components: string; lib: string }): string {
  let out = source;
  for (const key of ["components", "lib"] as const) {
    const from = new RegExp(`(["'\`])${escape(REGISTRY_ALIASES[key])}(?=[/"'\`])`, "g");
    out = out.replace(from, (_match, quote: string) => `${quote}${aliases[key]}`);
  }
  return out;
}

/** Prepends the Next.js client directive unless the file already starts with it. */
export function withUseClient(source: string): string {
  if (/^\s*(["'])use client\1/.test(source)) return source;
  return `"use client";\n\n${source}`;
}

/** The package name of `name` or `name@range`, scoped or not. */
export function packageName(spec: string): string {
  const at = spec.indexOf("@", spec.startsWith("@") ? 1 : 0);
  return at > 0 ? spec.slice(0, at) : spec;
}
