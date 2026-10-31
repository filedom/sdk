import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DATA_SLOTS,
  PRIMITIVE_SLOTS,
  REGISTRY_BLOCKS,
  REGISTRY_PRIMITIVES,
  REGISTRY_SETS,
  type RegistrySetId,
} from "./contracts.js";
import { validateJson, type JsonSchema } from "./json-schema.js";
import { PACKAGE_ROOT, readRegistry, REGISTRY_ALIASES, resolveItems, type RegistryItem } from "./registry.js";

const ui = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const schema = JSON.parse(readFileSync(ui("schema/registry.schema.json"), "utf8")) as JsonSchema;
const raw = JSON.parse(readFileSync(ui("registry.json"), "utf8")) as unknown;
const registry = readRegistry();
const contracts = readFileSync(ui("CONTRACTS.md"), "utf8");
const byName = new Map(registry.items.map((item) => [item.name, item]));

/**
 * TODO(W2): registry sets whose sources are not authored yet. While a set is listed here
 * and `registry/<set>/` does not exist, its source checks are reported as todo. As soon as
 * the directory exists the checks run in full and fail on any missing file or slot. W3
 * empties this list; after that a missing set directory fails.
 */
const PENDING_SETS: readonly RegistrySetId[] = ["react", "preact", "vue", "svelte", "angular", "solid", "lit", "astro"];

/** Block -> slots, from the `data-slot` table in CONTRACTS.md section 3. */
function contractSlotsByBlock(): Map<string, string[]> {
  const section = contracts.slice(contracts.indexOf("## 3."), contracts.indexOf("## 4."));
  const map = new Map<string, string[]>();
  for (const [, slot, block] of section.matchAll(/^\| `([a-z-]+)` \|[^|\n]*\| ([a-z-]+)[^|\n]*\|$/gm)) {
    if (!(REGISTRY_BLOCKS as readonly string[]).includes(block)) continue;
    map.set(block, [...(map.get(block) ?? []), slot]);
  }
  return map;
}

/** The example item in CONTRACTS.md section 5. */
function contractExample(): RegistryItem {
  const section = contracts.slice(contracts.indexOf("## 5."), contracts.indexOf("## 6."));
  const json = /```json\n([\s\S]*?)```/.exec(section)?.[1];
  return (JSON.parse(json ?? "{}") as { items: RegistryItem[] }).items[0];
}

describe("registry.json", () => {
  it("validates against schema/registry.schema.json", () => {
    expect(validateJson(schema, raw)).toEqual([]);
  });

  it("is checked by a validator that rejects what the schema forbids", () => {
    const bad = {
      name: "domdoc",
      items: [{ name: "Bad_Name", type: "widget", files: { ember: [{ path: "src/x.ts", target: "x.ts" }] }, extra: true }],
    };
    const errors = validateJson(schema, bad).join("\n");
    expect(errors).toContain("/items/0/name");
    expect(errors).toContain("/items/0/type");
    expect(errors).toContain("/items/0/files/ember (name)");
    expect(errors).toContain("/items/0/files/ember/0/path");
    expect(errors).toContain("unexpected property extra");
    expect(validateJson(schema, { name: "domdoc", items: [{ name: "x", type: "lib", files: { react: [] } }] }).join()).toContain("fewer than 1 items");
  });

  it("lists exactly the frozen primitives and blocks with their types", () => {
    expect(registry.items.map((item) => item.name)).toEqual([...REGISTRY_PRIMITIVES, ...REGISTRY_BLOCKS]);
    for (const item of registry.items) {
      const expected = item.name === "cn" ? "lib" : (REGISTRY_BLOCKS as readonly string[]).includes(item.name) ? "block" : "primitive";
      expect(item.type, item.name).toBe(expected);
    }
  });

  it("matches the example item in CONTRACTS.md", () => {
    const example = contractExample();
    const item = byName.get(example.name);
    expect(item).toBeDefined();
    expect(item).toMatchObject({
      type: example.type,
      description: example.description,
      slots: example.slots,
      registryDependencies: example.registryDependencies,
    });
    for (const [set, files] of Object.entries(example.files)) expect(item!.files[set as RegistrySetId]).toEqual(files);
    for (const [set, deps] of Object.entries(example.dependencies ?? {})) expect(item!.dependencies?.[set as RegistrySetId]).toEqual(deps);
  });

  it("gives every item files for every registry set, under registry/<set>/", () => {
    for (const item of registry.items) {
      expect(Object.keys(item.files).sort(), item.name).toEqual([...REGISTRY_SETS].sort());
      for (const set of REGISTRY_SETS) {
        for (const file of item.files[set]!) expect(file.path.startsWith(`registry/${set}/`), file.path).toBe(true);
      }
    }
  });

  it("never installs two files to the same target in one set", () => {
    for (const set of REGISTRY_SETS) {
      const targets = registry.items.flatMap((item) => item.files[set]!.map((file) => `${item.type === "lib" ? "lib" : "components"}:${file.target}`));
      expect(new Set(targets).size, set).toBe(targets.length);
    }
  });

  it("depends only on known items, without cycles, and installs everything from the toolbar and shell", () => {
    for (const item of registry.items) {
      for (const dep of item.registryDependencies ?? []) expect(byName.has(dep), `${item.name} -> ${dep}`).toBe(true);
      expect(() => resolveItems(registry, [item.name])).not.toThrow();
    }
    const installed = resolveItems(registry, ["viewer-shell", "toolbar"]).map((item) => item.name);
    expect(installed[0]).toBe("cn");
    expect(installed).toEqual(expect.arrayContaining([...REGISTRY_BLOCKS]));
    for (const block of REGISTRY_BLOCKS) {
      if (block !== "domdoc-provider") expect(resolveItems(registry, [block]).map((i) => i.name), block).toContain("domdoc-provider");
    }
  });

  it("gives each block the data-slot names CONTRACTS.md assigns it", () => {
    const table = contractSlotsByBlock();
    expect(table.size).toBeGreaterThan(0);
    for (const block of REGISTRY_BLOCKS) expect([...(byName.get(block)!.slots ?? [])].sort(), block).toEqual([...(table.get(block) ?? [])].sort());
    const assigned = registry.items.flatMap((item) => (item.type === "block" ? item.slots ?? [] : []));
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned, "usage-notice"].sort()).toEqual([...DATA_SLOTS].sort());
  });

  it("gives each primitive its default slots", () => {
    for (const name of REGISTRY_PRIMITIVES) {
      const slots = byName.get(name)!.slots ?? [];
      for (const slot of slots) expect(PRIMITIVE_SLOTS as readonly string[], `${name}: ${slot}`).toContain(slot);
      if (name !== "cn") expect(slots[0]).toBe(name);
    }
    const all = registry.items.flatMap((item) => (item.type === "primitive" ? item.slots ?? [] : []));
    expect(all.sort()).toEqual([...PRIMITIVE_SLOTS].sort());
  });

  it("uses only clsx, tailwind-merge, lucide icons, and @domdoc packages", () => {
    const allowed = /^(clsx|tailwind-merge|lucide(-[a-z-]+)?|@domdoc\/[a-z-]+)(@.+)?$/;
    for (const item of registry.items) {
      for (const [set, deps] of Object.entries(item.dependencies ?? {})) {
        expect(REGISTRY_SETS as readonly string[]).toContain(set);
        for (const dep of deps) expect(dep, `${item.name}/${set}`).toMatch(allowed);
      }
    }
    const provider = byName.get("domdoc-provider")!;
    for (const set of REGISTRY_SETS) {
      expect(provider.dependencies?.[set], set).toContain("@domdoc/core");
      expect(provider.dependencies?.[set]?.some((dep) => dep.startsWith("@domdoc/") && dep !== "@domdoc/core"), set).toBe(true);
      expect(byName.get("cn")!.dependencies?.[set]).toEqual(["clsx", "tailwind-merge"]);
    }
  });
});

describe.each(REGISTRY_SETS)("registry/%s sources", (set) => {
  const dir = join(PACKAGE_ROOT, "registry", set);
  if (PENDING_SETS.includes(set) && !existsSync(dir)) {
    it.todo(`TODO(W2): author registry/${set}/ (file existence and data-slot checks run once it exists)`);
    return;
  }

  it("has the set directory", () => {
    expect(existsSync(dir), dir).toBe(true);
  });

  for (const item of registry.items) {
    it(`${item.name}: every file exists and renders the item's data-slot names`, () => {
      const files = item.files[set]!;
      const sources = files.map((file) => {
        const path = join(PACKAGE_ROOT, file.path);
        expect(existsSync(path), file.path).toBe(true);
        return readFileSync(path, "utf8");
      });
      const text = sources.join("\n");
      for (const slot of item.slots ?? []) {
        expect(new RegExp(`["'\`]${slot}["'\`]`).test(text), `${item.name} (${set}) renders data-slot "${slot}"`).toBe(true);
      }
      expect(text, `${item.name} (${set}) imports through ${REGISTRY_ALIASES.components} and ${REGISTRY_ALIASES.lib}`).not.toMatch(/["'`](\$lib|~)\//);
    });
  }
});
