import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BLOCK_SLOTS,
  DATA_SLOTS,
  FILEDOM_STATES,
  FRAMEWORKS,
  FRAMEWORK_REGISTRY_SET,
  PRIMITIVE_SLOTS,
  READY_STATE,
  REGISTRY_BLOCKS,
  REGISTRY_PRIMITIVES,
  REGISTRY_SETS,
  PLAYGROUND_PATH,
  SAMPLE_PDF_PATH,
  SITE_BASE,
  STATE_ATTRIBUTE,
  bundlesPath,
  examplePath,
} from "./contracts.js";

const ui = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const sdk = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const json = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
const contracts = readFileSync(ui("CONTRACTS.md"), "utf8");
const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

describe("frameworks", () => {
  it("are the eleven frozen ids", () => {
    expect([...FRAMEWORKS]).toEqual(["react", "next", "preact", "vue", "nuxt", "svelte", "sveltekit", "angular", "solid", "lit", "astro"]);
  });

  it("each map to a registry set", () => {
    for (const fw of FRAMEWORKS) expect(REGISTRY_SETS).toContain(FRAMEWORK_REGISTRY_SET[fw]);
  });

  it("each have an example package shell and nothing else lives in examples/", () => {
    const dirs = readdirSync(sdk("examples"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs.sort()).toEqual([...FRAMEWORKS].sort());
    for (const fw of FRAMEWORKS) {
      const path = sdk(`examples/${fw}/package.json`);
      expect(existsSync(path), path).toBe(true);
      const pkg = json(path);
      expect(pkg.name).toBe(`@filedom/example-${fw}`);
      expect(pkg.private).toBe(true);
    }
  });

  it("examples are workspace packages", () => {
    expect(readFileSync(sdk("pnpm-workspace.yaml"), "utf8")).toMatch(/^\s*-\s*"examples\/\*"\s*$/m);
  });
});

describe("data-slot names", () => {
  it("are exported, unique, and kebab-case", () => {
    expect(DATA_SLOTS.length).toBeGreaterThan(0);
    const all = [...DATA_SLOTS, ...PRIMITIVE_SLOTS];
    expect(new Set(all).size).toBe(all.length);
    for (const slot of all) expect(slot).toMatch(kebab);
  });

  it("include the shell, toolbar, zoom, and search controls the e2e suites select on", () => {
    for (const slot of ["viewer-shell", "viewer-canvas", "toolbar", "zoom-in", "zoom-label", "search-input", "theme-toggle", "mode-select", "open-sample"]) {
      expect(DATA_SLOTS).toContain(slot);
    }
  });

  it("bind only to TOOLBAR_CATALOG action ids", async () => {
    const { TOOLBAR_CATALOG } = await import("@filedom/core");
    const ids = new Set(TOOLBAR_CATALOG.flatMap((group) => group.actions.map((action) => action.id)));
    for (const action of Object.values(BLOCK_SLOTS)) if (action) expect(ids).toContain(action);
  });

  it("are all listed in CONTRACTS.md", () => {
    for (const slot of [...DATA_SLOTS, ...PRIMITIVE_SLOTS]) expect(contracts).toContain(`\`${slot}\``);
  });
});

describe("readiness marker and URLs", () => {
  it("freeze data-filedom-state=ready on the shell", () => {
    expect(STATE_ATTRIBUTE).toBe("data-filedom-state");
    expect(READY_STATE).toBe("ready");
    expect(FILEDOM_STATES).toContain("ready");
    expect(contracts).toContain('data-filedom-state="ready"');
  });

  it("put everything under /sdk/docs/ and bundles under /api/bundles/<version>/", () => {
    expect(SITE_BASE).toBe("/sdk/docs/");
    expect(examplePath("vue")).toBe("/sdk/docs/examples/vue/");
    expect(PLAYGROUND_PATH).toBe("/sdk/integrations");
    expect(SAMPLE_PDF_PATH).toBe("/sdk/docs/samples/hello.pdf");
    expect(bundlesPath("1.2.3")).toBe("/api/bundles/1.2.3/");
    for (const path of ["/sdk/integrations", "/sdk/docs/examples/<fw>/", "/sdk/docs/samples/hello.pdf", "/api/bundles/<version>/"]) {
      expect(contracts).toContain(path);
    }
  });

  it("open the sample from /sdk/docs/samples/hello.pdf", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        if (name.name.startsWith(".") || name.name === "node_modules" || name.name === "dist" || name.name === "build") continue;
        const full = `${dir}/${name.name}`;
        if (name.isDirectory()) walk(full);
        else if (/\.(?:astro|css|html|js|mjs|svelte|ts|tsx|vue)$/.test(name.name)) files.push(full);
      }
    };
    walk(ui("registry"));
    walk(sdk("examples"));
    const bad = files.filter((file) => readFileSync(file, "utf8").includes("/sdk-docs/samples/"));
    expect(bad).toEqual([]);
  });

  it("registers the Lit viewer element from the shell", () => {
    for (const file of [ui("registry/lit/viewer-shell.ts"), sdk("examples/lit/src/components/filedom/viewer-shell.ts")]) {
      expect(readFileSync(file, "utf8")).toContain('customElements.define("filedom-viewer"');
    }
  });
});

describe("schemas", () => {
  const registry = json(ui("schema/registry.schema.json"));
  const project = json(ui("schema/filedom.schema.json"));
  const example = json(ui("schema/filedom-example.schema.json"));

  it("are draft 2020-12 with an id", () => {
    for (const schema of [registry, project, example]) {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.$id).toMatch(/^https:\/\/filedom\.io\/sdk\/docs\/schema\//);
    }
  });

  it("use the frozen framework and registry set lists", () => {
    expect(project.properties.framework.enum).toEqual([...FRAMEWORKS]);
    expect(example.properties.framework.enum).toEqual([...FRAMEWORKS]);
    expect(registry.$defs.registrySet.enum).toEqual([...REGISTRY_SETS]);
  });

  it("require the frozen fields", () => {
    expect(registry.$defs.item.required).toEqual(["name", "type", "files"]);
    expect(Object.keys(registry.$defs.item.properties)).toEqual(
      expect.arrayContaining(["files", "dependencies", "registryDependencies", "slots"]),
    );
    expect(project.required).toEqual(["framework", "componentDir", "css", "aliases"]);
    expect(project.properties.aliases.required).toEqual(["components", "lib"]);
    expect(example.required).toEqual(["framework", "label", "logo", "install", "add", "files"]);
  });

  it("list every registry item in CONTRACTS.md", () => {
    for (const item of [...REGISTRY_PRIMITIVES, ...REGISTRY_BLOCKS]) expect(contracts).toContain(`\`${item}\``);
  });
});
