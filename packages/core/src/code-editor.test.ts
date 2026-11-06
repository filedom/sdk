import { describe, expect, it } from "vitest";
import { canOpenAsCode, codeFormat, formatCode, highlightCode, isCodeFile, languageFromName, renderCodeHtml } from "./code-editor.js";

describe("code editor", () => {
  it("recognises source files and leaves documents alone", () => {
    expect(languageFromName("src/App.tsx")).toBe("tsx");
    expect(isCodeFile("notes.ts")).toBe(true);
    expect(languageFromName("App.vue")).toBeUndefined();
    expect(languageFromName("App.svelte")).toBeUndefined();
    expect(languageFromName("index.astro")).toBeUndefined();
    expect(isCodeFile("App.vue")).toBe(false);
    expect(isCodeFile("App.svelte")).toBe(false);
    expect(isCodeFile("index.astro")).toBe(false);
    expect(isCodeFile("Main.java")).toBe(true);
    expect(isCodeFile("Dockerfile")).toBe(true);
    expect(isCodeFile("report.pdf")).toBe(false);
    expect(isCodeFile("photo.png")).toBe(false);
    expect(canOpenAsCode("readme", new TextEncoder().encode("hello\n"))).toBe(true);
    expect(canOpenAsCode("app.bin", Uint8Array.from([0, 1, 2, 3, 4]))).toBe(false);
  });

  it("formats JSON with the configured indent", () => {
    expect(formatCode('{"a":1}', "json", { ...codeFormat, indent: 2 })).toBe('{\n  "a": 1\n}\n');
  });

  it("reindents a script and can switch the quote style", () => {
    const source = 'function hi(){\nconst name = "Ada"\nreturn name\n}';
    const formatted = formatCode(source, "javascript", { ...codeFormat, quote: "single", semicolons: true, trailingComma: true });
    expect(formatted).toContain("  const name = 'Ada';");
    expect(formatted).toContain("  return name;");
    expect(formatted.startsWith("function hi() {") || formatted.startsWith("function hi(){")).toBe(true);
  });

  it("leaves a call that continues on the next line intact", () => {
    const source = "const options = useMemo(\n  () => ({ toolbar: false }),\n  [],\n);\n";
    const formatted = formatCode(source, "tsx", codeFormat);
    expect(formatted).toContain("const options = useMemo(");
    expect(formatted).not.toContain("useMemo(;");
  });

  it("does not put a comma after markup in a return", () => {
    const source = "return (\n  <FiledomProvider />\n);\n";
    const formatted = formatCode(source, "tsx", codeFormat);
    expect(formatted).not.toContain("<FiledomProvider />,");
    expect(formatted).toContain("<FiledomProvider />");
  });

  it("styles keywords and strings from the open style", () => {
    const tokens = highlightCode('const title = "FileDOM"', "typescript");
    expect(tokens.find((token) => token.text === "const")?.kind).toBe("keyword");
    expect(tokens.find((token) => token.text === '"FileDOM"')?.kind).toBe("string");
    const html = renderCodeHtml('const title = "FileDOM"', "typescript");
    expect(html).toContain("const");
    expect(html).toContain("#8eb6ff");
  });
});
