import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { run } from "./cli.js";
import { FRAMEWORKS, FRAMEWORK_REGISTRY_SET, REGISTRY_SETS, type FrameworkId } from "./contracts.js";
import { validateJson, type JsonSchema } from "./json-schema.js";
import { detectFramework, libDir, withThemeImport } from "./project.js";
import { resolveItems, rewriteAliases, type Registry } from "./registry.js";

const projectSchema = JSON.parse(
  readFileSync(fileURLToPath(new URL("../schema/domdoc.schema.json", import.meta.url)), "utf8"),
) as JsonSchema;

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "domdoc-ui-"));
  temps.push(dir);
  return dir;
}

function put(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");

/** The package each framework's project declares, as a user's package.json would. */
const FRAMEWORK_DEPS: Record<FrameworkId, Record<string, string>> = {
  react: { react: "^19.0.0", "react-dom": "^19.0.0" },
  next: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
  preact: { preact: "^10.25.0" },
  vue: { vue: "^3.5.0" },
  nuxt: { nuxt: "^3.15.0", vue: "^3.5.0" },
  svelte: { svelte: "^5.0.0" },
  sveltekit: { "@sveltejs/kit": "^2.0.0", svelte: "^5.0.0" },
  angular: { "@angular/core": "^20.0.0", "@angular/common": "^20.0.0" },
  solid: { "solid-js": "^1.9.0" },
  lit: { lit: "^3.2.0" },
  astro: { astro: "^5.0.0", "@astrojs/react": "^4.0.0", react: "^19.0.0" },
};

function project(framework: FrameworkId, extra: Record<string, string> = {}): string {
  const dir = tempDir();
  put(dir, "package.json", JSON.stringify({ name: "app", devDependencies: { ...FRAMEWORK_DEPS[framework], ...extra } }));
  return dir;
}

/** A source file the way registry authors write it: canonical aliases and quoted slot names. */
function source(name: string, deps: string[], slots: string[]): string {
  return [
    ...deps.map((dep) => `import { ${dep} } from "@/components/domdoc/${dep}";`),
    `import { cn } from "@/lib/cn";`,
    `import "@/library-not-an-alias";`,
    `export const ${name.replace(/-/g, "_")} = ${JSON.stringify(slots)};`,
    "",
  ].join("\n");
}

/** A registry dir with cn -> button -> zoom-controls, and a toolbar on top, for every set. */
function fixtureRegistry(): string {
  const root = tempDir();
  const items: Registry["items"] = [
    { name: "cn", type: "lib", files: {}, dependencies: {} },
    { name: "button", type: "primitive", slots: ["button"], registryDependencies: ["cn"], files: {} },
    {
      name: "zoom-controls",
      type: "block",
      slots: ["zoom-controls", "zoom-in"],
      registryDependencies: ["button"],
      files: {},
      dependencies: {},
    },
    { name: "toolbar", type: "block", slots: ["toolbar"], registryDependencies: ["zoom-controls", "button"], files: {} },
  ];
  for (const set of REGISTRY_SETS) {
    const ext = set === "vue" ? "vue" : set === "svelte" ? "svelte" : set === "astro" ? "astro" : "tsx";
    for (const item of items) {
      const file = item.type === "lib" ? { path: `registry/${set}/lib/cn.ts`, target: "cn.ts" } : { path: `registry/${set}/${item.name}.${ext}`, target: `${item.name}.${ext}` };
      item.files[set] = [file];
      put(root, file.path, item.type === "lib" ? "export const cn = () => '';\n" : source(item.name, item.registryDependencies?.filter((d) => d !== "cn") ?? [], item.slots ?? []));
    }
    byName(items, "cn").dependencies![set] = ["clsx", "tailwind-merge@^3.0.0"];
    byName(items, "zoom-controls").dependencies![set] = [`lucide-${set}`, `@domdoc/${set}`];
  }
  put(root, "registry.json", JSON.stringify({ name: "domdoc", items }));
  return root;
}

function byName(items: Registry["items"], name: string) {
  return items.find((i) => i.name === name)!;
}

function cli(argv: string[], registryRoot?: string) {
  let stdout = "";
  let stderr = "";
  const code = run(argv, { registryRoot, stdout: (t) => (stdout += t), stderr: (t) => (stderr += t) });
  return { code, stdout, stderr };
}

describe("framework detection", () => {
  it.each(FRAMEWORKS)("detects %s from package.json", (fw) => {
    expect(detectFramework({ dependencies: FRAMEWORK_DEPS[fw] })).toBe(fw);
  });

  it("reads dependencies, devDependencies, and peerDependencies", () => {
    expect(detectFramework({ peerDependencies: { vue: "^3.5.0" } })).toBe("vue");
    expect(detectFramework({ devDependencies: { "solid-js": "^1.9.0" } })).toBe("solid");
  });

  it("returns null for a project with no known framework", () => {
    expect(detectFramework({ dependencies: { express: "^5.0.0" } })).toBeNull();
    expect(detectFramework(null)).toBeNull();
  });
});

describe("domdoc init", () => {
  it.each(FRAMEWORKS)("writes a valid domdoc.json and imports the theme for %s", (fw) => {
    const dir = project(fw);
    const { code, stdout, stderr } = cli(["init", "--cwd", dir]);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    expect(stdout).toContain(`detected ${fw}`);
    const config = JSON.parse(read(dir, "domdoc.json"));
    expect(validateJson(projectSchema, config)).toEqual([]);
    expect(config.framework).toBe(fw);
    const css = read(dir, config.css);
    expect(css).toBe('@import "tailwindcss";\n@import "@domdoc/ui/theme.css";\n');
    expect(stdout).toContain("@domdoc/ui tailwindcss");
  });

  it("uses the framework's conventional paths and aliases", () => {
    const kit = project("sveltekit");
    cli(["init", "--cwd", kit]);
    expect(JSON.parse(read(kit, "domdoc.json"))).toMatchObject({
      componentDir: "src/lib/components/domdoc",
      css: "src/app.css",
      aliases: { components: "$lib/components/domdoc", lib: "$lib" },
    });
    const nuxt = project("nuxt");
    cli(["init", "--cwd", nuxt]);
    expect(JSON.parse(read(nuxt, "domdoc.json"))).toMatchObject({ componentDir: "components/domdoc", css: "assets/css/main.css", aliases: { components: "~/components/domdoc" } });
    const next = project("next");
    mkdirSync(join(next, "src/app"), { recursive: true });
    cli(["init", "--cwd", next]);
    expect(JSON.parse(read(next, "domdoc.json"))).toMatchObject({ componentDir: "src/components/domdoc", css: "src/app/globals.css" });
  });

  it("adds the import after Tailwind in an existing stylesheet, once", () => {
    const dir = project("vue");
    put(dir, "src/style.css", '@import "tailwindcss";\n\nbody { margin: 0; }\n');
    expect(cli(["init", "--cwd", dir]).code).toBe(0);
    expect(JSON.parse(read(dir, "domdoc.json")).css).toBe("src/style.css");
    const once = read(dir, "src/style.css");
    expect(once).toBe('@import "tailwindcss";\n@import "@domdoc/ui/theme.css";\n\nbody { margin: 0; }\n');
    const again = cli(["init", "--cwd", dir]);
    expect(again.code).toBe(0);
    expect(again.stdout).toContain("kept domdoc.json");
    expect(again.stdout).toContain("already imports");
    expect(read(dir, "src/style.css")).toBe(once);
  });

  it("puts the import first when the stylesheet has no Tailwind import", () => {
    expect(withThemeImport('@charset "utf-8";\nbody{}\n')).toBe('@charset "utf-8";\n@import "@domdoc/ui/theme.css";\nbody{}\n');
    expect(withThemeImport("body{}\n")).toBe('@import "@domdoc/ui/theme.css";\nbody{}\n');
    expect(withThemeImport("@import 'tailwindcss';")).toBe("@import 'tailwindcss';\n@import \"@domdoc/ui/theme.css\";\n");
  });

  it("does not list packages the project already has", () => {
    const dir = project("react", { "@domdoc/ui": "^0.1.0", tailwindcss: "^4.0.0" });
    expect(cli(["init", "--cwd", dir]).stdout).not.toContain("Install the packages");
  });

  it("honours --framework and rejects unknown ids", () => {
    const dir = project("react");
    expect(cli(["init", "--cwd", dir, "--framework", "preact"]).code).toBe(0);
    expect(JSON.parse(read(dir, "domdoc.json")).framework).toBe("preact");
    const bad = cli(["init", "--cwd", project("react"), "--framework", "ember"]);
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("unknown framework ember");
  });

  it("fails clearly without a package.json or a detectable framework", () => {
    expect(cli(["init", "--cwd", tempDir()]).stderr).toContain("no package.json");
    const dir = tempDir();
    put(dir, "package.json", "{}");
    const result = cli(["init", "--cwd", dir]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--framework");
  });

  it("writes nothing on --dry-run", () => {
    const dir = project("svelte");
    const { code, stdout } = cli(["init", "--cwd", dir, "--dry-run"]);
    expect(code).toBe(0);
    expect(stdout).toContain("would create domdoc.json");
    expect(stdout).toContain("would create src/index.css");
    expect(existsSync(join(dir, "domdoc.json"))).toBe(false);
    expect(existsSync(join(dir, "src"))).toBe(false);
  });
});

describe("domdoc add", () => {
  it.each(FRAMEWORKS)("copies an item and its registry dependencies for %s with aliases rewritten", (fw) => {
    const registry = fixtureRegistry();
    const dir = project(fw);
    expect(cli(["init", "--cwd", dir]).code).toBe(0);
    const config = JSON.parse(read(dir, "domdoc.json"));
    const set = FRAMEWORK_REGISTRY_SET[fw];
    const ext = set === "vue" ? "vue" : set === "svelte" ? "svelte" : set === "astro" ? "astro" : "tsx";

    const { code, stdout, stderr } = cli(["add", "zoom-controls", "--cwd", dir], registry);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    expect(stdout).toContain("adding cn, button, zoom-controls");

    const zoom = read(dir, `${config.componentDir}/zoom-controls.${ext}`);
    expect(zoom).toContain(`from "${config.aliases.components}/button"`);
    expect(zoom).toContain(`from "${config.aliases.lib}/cn"`);
    expect(zoom).toContain('"@/library-not-an-alias"');
    expect(zoom).toContain('"zoom-controls"');
    expect(existsSync(join(dir, config.componentDir, `button.${ext}`))).toBe(true);
    expect(existsSync(join(dir, libDir(config), "cn.ts"))).toBe(true);
    expect(existsSync(join(dir, config.componentDir, `toolbar.${ext}`))).toBe(false);

    expect(zoom.startsWith('"use client";')).toBe(fw === "next");
    expect(read(dir, `${libDir(config)}/cn.ts`)).not.toContain("use client");

    expect(stdout).toContain(`clsx tailwind-merge@^3.0.0 lucide-${set} @domdoc/${set}`);
  });

  it("places lib items under the directory aliases.lib points at", () => {
    const base = { $schema: "", framework: "react" as const, css: "x.css" };
    expect(libDir({ ...base, componentDir: "src/components/domdoc", aliases: { components: "@/components/domdoc", lib: "@/lib" } })).toBe("src/lib");
    expect(libDir({ ...base, componentDir: "src/lib/components/domdoc", aliases: { components: "$lib/components/domdoc", lib: "$lib" } })).toBe("src/lib");
    expect(libDir({ ...base, componentDir: "components/domdoc", aliases: { components: "~/components/domdoc", lib: "~/utils" } })).toBe("utils");
    expect(() => libDir({ ...base, componentDir: "src/ui", aliases: { components: "@/components/domdoc", lib: "@/lib" } })).toThrow(/aliases.lib/);
  });

  it("resolves transitive registry dependencies once, dependencies first", () => {
    const registry = JSON.parse(read(fixtureRegistry(), "registry.json")) as Registry;
    expect(resolveItems(registry, ["toolbar", "button"]).map((i) => i.name)).toEqual(["cn", "button", "zoom-controls", "toolbar"]);
    expect(() => resolveItems(registry, ["nope"])).toThrow(/unknown item nope/);
    const cyclic: Registry = {
      name: "domdoc",
      items: [
        { name: "a", type: "block", registryDependencies: ["b"], files: {} },
        { name: "b", type: "block", registryDependencies: ["a"], files: {} },
      ],
    };
    expect(() => resolveItems(cyclic, ["a"])).toThrow(/cycle: a -> b -> a/);
  });

  it("rewrites only whole alias specifiers", () => {
    const aliases = { components: "~/ui", lib: "~/utils" };
    expect(rewriteAliases(`import a from '@/components/domdoc/a';\nimport b from "@/lib";\nimport c from \`@/lib/c\`;\n"@/libs"`, aliases)).toBe(
      `import a from '~/ui/a';\nimport b from "~/utils";\nimport c from \`~/utils/c\`;\n"@/libs"`,
    );
  });

  it("keeps existing files unless --overwrite", () => {
    const registry = fixtureRegistry();
    const dir = project("react");
    cli(["init", "--cwd", dir]);
    put(dir, "src/components/domdoc/button.tsx", "// my edits\n");
    const first = cli(["add", "button", "--cwd", dir], registry);
    expect(first.code).toBe(0);
    expect(first.stdout).toContain("skipped src/components/domdoc/button.tsx (exists)");
    expect(first.stdout).toContain("--overwrite");
    expect(read(dir, "src/components/domdoc/button.tsx")).toBe("// my edits\n");

    const same = cli(["add", "button", "--cwd", dir], registry);
    expect(same.stdout).toContain("unchanged src/lib/cn.ts");

    const forced = cli(["add", "button", "--cwd", dir, "--overwrite"], registry);
    expect(forced.stdout).toContain("overwrote src/components/domdoc/button.tsx");
    expect(read(dir, "src/components/domdoc/button.tsx")).toContain('"button"');
  });

  it("writes nothing on --dry-run but reports the plan and missing packages", () => {
    const registry = fixtureRegistry();
    const dir = project("vue");
    cli(["init", "--cwd", dir]);
    const { code, stdout } = cli(["add", "toolbar", "--cwd", dir, "--dry-run"], registry);
    expect(code).toBe(0);
    expect(stdout).toContain("would create src/components/domdoc/toolbar.vue");
    expect(stdout).toContain("would create src/lib/cn.ts");
    expect(stdout).toContain("Missing npm packages");
    expect(existsSync(join(dir, "src/components"))).toBe(false);
    expect(existsSync(join(dir, "src/lib"))).toBe(false);
  });

  it("only lists npm packages the project is missing, with its package manager", () => {
    const registry = fixtureRegistry();
    const dir = project("svelte", { clsx: "^2.0.0" });
    put(dir, "pnpm-lock.yaml", "");
    cli(["init", "--cwd", dir]);
    const { stdout } = cli(["add", "zoom-controls", "--cwd", dir], registry);
    expect(stdout).toContain("pnpm add tailwind-merge@^3.0.0 lucide-svelte @domdoc/svelte");
    expect(stdout).not.toMatch(/add clsx/);
  });

  it("resolves --cwd relative to the working directory", () => {
    const registry = fixtureRegistry();
    const parent = tempDir();
    put(parent, "app/package.json", JSON.stringify({ dependencies: { react: "^19.0.0" } }));
    const io = { cwd: parent, registryRoot: registry, stdout: () => {}, stderr: () => {} };
    expect(run(["init", "--cwd", "app"], io)).toBe(0);
    expect(run(["add", "button", "--cwd=app"], io)).toBe(0);
    expect(existsSync(join(parent, "app/src/components/domdoc/button.tsx"))).toBe(true);
  });

  it("fails without domdoc.json, items, or a known item", () => {
    const registry = fixtureRegistry();
    const dir = project("react");
    expect(cli(["add", "button", "--cwd", dir], registry).stderr).toContain("Run domdoc init first");
    cli(["init", "--cwd", dir]);
    expect(cli(["add", "--cwd", dir], registry).stderr).toContain("name at least one item");
    const unknown = cli(["add", "nope", "--cwd", dir], registry);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("unknown item nope");
  });

  it("fails before writing when a registry source is missing", () => {
    const registry = fixtureRegistry();
    rmSync(join(registry, "registry/react/zoom-controls.tsx"));
    const dir = project("react");
    cli(["init", "--cwd", dir]);
    const result = cli(["add", "zoom-controls", "--cwd", dir], registry);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("registry/react/zoom-controls.tsx");
    expect(existsSync(join(dir, "src/components"))).toBe(false);
  });

  it("rejects an invalid domdoc.json", () => {
    const dir = project("react");
    put(dir, "domdoc.json", JSON.stringify({ framework: "ember" }));
    const result = cli(["add", "button", "--cwd", dir], fixtureRegistry());
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("domdoc.json is invalid");
  });
});

describe("domdoc command line", () => {
  it("prints help, and rejects unknown commands and options", () => {
    expect(cli(["--help"])).toMatchObject({ code: 0, stdout: expect.stringContaining("Usage: domdoc") });
    expect(cli([]).code).toBe(1);
    expect(cli(["publish"]).stderr).toContain("unknown command publish");
    expect(cli(["add", "--force"]).stderr).toContain("unknown option --force");
    expect(cli(["init", "--cwd"]).stderr).toContain("--cwd needs a value");
  });
});
