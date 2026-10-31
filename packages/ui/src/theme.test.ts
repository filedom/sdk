import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOKEN_VAR } from "../../core/src/theme.js";

const css = readFileSync(fileURLToPath(new URL("../theme.css", import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")) as {
  exports: Record<string, unknown>;
  files: string[];
};

/** Declarations of the first rule whose selector is exactly `selector`. */
function block(selector: string): Map<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/,\s*/g, ",\\s*");
  const body = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (body === undefined) throw new Error(`no rule for ${selector}`);
  return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

const light = block(":root");
const dark = block(".dark");
const theme = block("@theme inline");
const bridge = block(":root,\n.dark");

const SHADCN = ["--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground", "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground", "--accent", "--accent-foreground", "--destructive", "--border", "--input", "--ring"];

describe("theme.css", () => {
  it("defines the shadcn tokens in light and dark", () => {
    for (const token of SHADCN) {
      expect(light.has(token), `:root ${token}`).toBe(true);
      expect(dark.has(token), `.dark ${token}`).toBe(true);
    }
    expect(light.get("--radius")).toBe("0.5rem");
    expect(light.get("--font-ui")).toMatch(/^"Inter", ui-sans-serif, system-ui/);
  });

  it("uses one blue primary: #2563eb light, #3b82f6 dark", () => {
    expect(light.get("--primary")).toBe("#2563eb");
    expect(dark.get("--primary")).toBe("#3b82f6");
    expect(light.get("--background")).not.toBe(dark.get("--background"));
  });

  it("exposes every token to Tailwind through @theme inline", () => {
    expect(css).toMatch(/@theme inline\s*\{/);
    for (const token of [...SHADCN, "--canvas"]) expect(theme.get(`--color-${token.slice(2)}`), token).toBe(`var(${token})`);
    expect(theme.get("--radius-lg")).toBe("var(--radius)");
    expect(theme.get("--font-sans")).toBe("var(--font-ui)");
    expect(css).toContain("@custom-variant dark");
  });

  it("references only variables it defines in both modes", () => {
    for (const [name, value] of [...theme, ...bridge]) {
      for (const [, ref] of value.matchAll(/var\((--[\w-]+)\)/g)) {
        expect(light.has(ref), `${name} -> ${ref} in :root`).toBe(true);
        if (!["--radius", "--font-ui", "--toolbar-height"].includes(ref)) expect(dark.has(ref), `${name} -> ${ref} in .dark`).toBe(true);
      }
    }
  });

  it("bridges the palette onto the viewer's --dd-* variables in light and dark", () => {
    const expected: Record<string, string> = {
      accent: "--primary",
      background: "--background",
      surface: "--card",
      "surface-raised": "--popover",
      text: "--foreground",
      "text-muted": "--muted-foreground",
      border: "--border",
      hover: "--accent",
      canvas: "--canvas",
      radius: "--radius",
      font: "--font-ui",
      field: "--background",
      control: "--secondary",
    };
    for (const [token, source] of Object.entries(expected)) {
      const name = `--dd-${TOKEN_VAR[token as keyof typeof TOKEN_VAR]}`;
      expect(bridge.get(name), name).toBe(`var(${source})`);
    }
    for (const name of bridge.keys()) expect(Object.values(TOKEN_VAR).map((v) => `--dd-${v}`)).toContain(name);
    expect(bridge.has("--dd-page")).toBe(false);
  });

  it("is exported as @domdoc/ui/theme.css", () => {
    expect(pkg.exports["./theme.css"]).toBe("./theme.css");
    expect(pkg.files).toContain("theme.css");
  });
});
