// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { FiledomViewer } from "./viewer.js";

describe("viewer theme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.head.querySelector("style[data-filedom]")?.remove();
  });

  it("starts light and switches palette, tokens, and the OS scheme in place", () => {
    let dark = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? dark : false;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }));

    const root = document.createElement("div");
    document.body.append(root);
    const viewer = new FiledomViewer(root, { bundles: {} });
    const themes: string[] = [];
    viewer.on("theme", (event) => themes.push(event.theme));
    const shell = root.querySelector<HTMLElement>(".dd-viewer")!;
    const capture = root.querySelector(".dd-capture")!;

    expect(capture.contains(shell)).toBe(true);
    expect(shell.dataset.theme).toBe("light");
    expect(shell.querySelector("style")?.textContent).toBe("");
    const themeMenu = root.querySelector<HTMLSelectElement>("[data-action=theme]")!;
    expect(themeMenu.value).toBe("filedom");
    expect(themeMenu.options).toHaveLength(4);
    themeMenu.value = "filedom-dark";
    themeMenu.dispatchEvent(new Event("change"));
    expect(shell.dataset.theme).toBe("dark");
    expect(themes).toEqual(["dark"]);
    themeMenu.value = "filedom";
    themeMenu.dispatchEvent(new Event("change"));
    expect(shell.dataset.theme).toBe("light");

    themeMenu.value = "paper";
    themeMenu.dispatchEvent(new Event("change"));
    expect(shell.dataset.theme).toBe("light");
    expect(shell.querySelector("style")?.textContent).toContain("--dd-accent-config:#1a5f4a");
    expect(themeMenu.value).toBe("paper");

    viewer.setTheme({ preference: "dark", ui: { accent: "#0f6e56", surface: "#16201c" } });
    expect(shell.dataset.theme).toBe("dark");
    expect(shell.dataset.scheme).toBeUndefined();
    const sheet = shell.querySelector("style")?.textContent ?? "";
    expect(sheet).toContain("--dd-accent-config:#0f6e56");
    expect(sheet).toContain("--dd-panel-config:#16201c");
    expect(sheet).not.toContain("-dark:");
    expect(themeMenu.value).toBe("custom");

    expect([...root.querySelectorAll(".dd-theme-panel h3")].map((heading) => heading.textContent)).toEqual([
      "Interface",
      "Document",
    ]);
    const page = root.querySelector<HTMLInputElement>("[data-theme-slot=document][data-theme-token=page]")!;
    expect(page.value).toBe("#ffffff");
    page.value = "#112233";
    page.dispatchEvent(new Event("input"));
    const accent = root.querySelector<HTMLInputElement>("[data-theme-slot=ui][data-theme-token=accent]")!;
    accent.value = "#445566";
    accent.dispatchEvent(new Event("input"));
    const colored = shell.querySelector("style")?.textContent ?? "";
    expect(colored).toContain("--dd-page-config:#112233");
    expect(colored).toContain("--dd-accent-config:#445566");
    expect(colored).toContain("--dd-panel-config:#16201c");
    expect(shell.dataset.theme).toBe("dark");

    viewer.setTheme("ink");
    expect(shell.dataset.theme).toBe("dark");
    expect(shell.querySelector("style")?.textContent).toContain("--dd-accent-config:#7dbaa4");
    expect(themeMenu.value).toBe("ink");

    viewer.setTheme("system");
    expect(shell.dataset.scheme).toBe("system");
    expect(shell.dataset.theme).toBe("light");
    expect(themeMenu.value).toBe("filedom");
    dark = true;
    for (const listener of listeners) listener();
    expect(shell.dataset.theme).toBe("dark");
    expect(themeMenu.value).toBe("filedom-dark");

    viewer.destroy();
    expect(root.querySelector(".dd-viewer")).toBeNull();
    expect(root.querySelector(".dd-capture")).toBeNull();
  });
});
