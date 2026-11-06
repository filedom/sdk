// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { elementFactory } from "./dom.js";
import type { DocInfo } from "./engine-types.js";
import { injectStyles, VIEWER_CSS } from "./styles.js";
import type { ToolbarActions, ToolbarState } from "./toolbar.js";
import { nestedMenuBox, shortError, shownTextFormat, Toolbar } from "./toolbar.js";
import { HistoryPanel } from "./history.js";

function actions(): ToolbarActions {
  return {
    pick() {},
    newFile() {},
    download() {},
    closeFile() {},
    storeFiledom() {},
    exportFile() {},
    undo() {},
    redo() {},
    toggle() {},
    setColor() {},
    setFont() {},
    setSize() {},
    highlight() {},
    clearHighlight() {},
    setHighlightColor() {},
    comment() {},
    align() {},
    indent() {},
    setLineSpacing() {},
    setViewMode() {},
    search() {},
    nextHit() {},
    replaceMatch() {},
    replaceAll() {},
    zoomIn() {},
    zoomOut() {},
    setZoom() {},
    fit() {},
    insertElement() {},
    setThemePreset() {},
    setThemeColors() {},
    setHelp() {},
    setToolbarVisible() {},
    setTrayVisible() {},
    lockToolbars() {},
    moveToolbar() {},
    replaceImage() {},
    deleteElement() {},
    deselect() {},
    paintShape() {},
    debugReport: () => "",
    playMedia() {},
    pauseMedia() {},
    muteMedia() {},
    setClipSpeed() {},
    appendClip() {},
    copyListing() {},
    setDisplayLayout() {},
  };
}

function chrome(
  format: DocInfo["format"],
  viewMode: ToolbarState["viewMode"],
  selectionKind: ToolbarState["selectionKind"] = "none",
): ToolbarState {
  const isPdf = format === "pdf";
  return {
    info: {
      format,
      pageCount: 1,
      trackChanges: false,
      author: "",
      pendingRevisions: 0,
      exportExtension: format,
      exportMime: "",
      canUndo: false,
      canRedo: false,
      capabilities: {
        editText: true,
        editStructure: true,
        formatText: format !== "pdf",
        formatParagraph: format !== "pdf",
        flowEmbeds: false,
        transform: isPdf,
        layers: isPdf,
        insert: format === "docx" || format === "doc",
      },
      warnings: [],
    },
    viewMode,
    modeLocked: false,
    zoom: 1,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    hasSelection: false,
    selectionKind,
    insertKinds: format === "docx" || format === "doc" ? ["image", "text-box", "code", "shape"] : [],
    isFiledom: false,
    helpOn: false,
    toolbarsLocked: false,
    hiddenGroups: [],
    availableTrays: format === "pdf" ? ["layers"] : [],
    shownTrays: [],
  };
}

describe("image capabilities", () => {
  it("keeps the text format group hidden when formatText is omitted", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    const state = chrome("png", "live", "text");
    state.info = {
      ...state.info!,
      capabilities: {
        editText: true,
        editStructure: false,
        formatText: false,
        formatParagraph: false,
        flowEmbeds: false,
        transform: true,
        layers: false,
        insert: true,
      },
    };
    toolbar.sync(state);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text-format"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text-paragraph"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);

    toolbar.sync({ ...state, selectionKind: "image" });
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);

    toolbar.sync({ ...state, selectionKind: "shape" });
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="fill"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="stroke"]')!.hidden).toBe(true);
  });
});

describe("file name", () => {
  it("shows the name with a placeholder icon, and a type icon when one exists", () => {
    const bar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    bar.sync({ ...chrome("pdf", "live"), fileName: "notes.pdf" });
    expect(bar.el.querySelector(".dd-toolbar-app .dd-file")).toBeNull();
    expect(bar.el.querySelector(".dd-file-row")?.previousElementSibling?.classList.contains("dd-toolbar-app")).toBe(true);
    expect(bar.el.querySelector(".dd-file-row .dd-file-name")?.textContent).toBe("notes.pdf");
    bar.setStatus("PDF · 1 page");
    expect(bar.el.querySelector(".dd-file-row .dd-status")?.textContent).toBe("PDF · 1 page");
    expect(bar.el.querySelector(".dd-file-icon svg")?.getAttribute("data-icon")).toBe("file");
    expect(bar.el.querySelector(".dd-tab [data-action='fullscreen']")).toBeTruthy();
    expect(bar.el.querySelector(".dd-tab [data-action='close-file']")).toBeTruthy();
    expect(bar.el.querySelector(".dd-file-actions")).toBeNull();
    bar.sync({ ...chrome("png", "live"), fileName: "shot.png" });
    expect(bar.el.querySelector(".dd-file-name")?.textContent).toBe("shot.png");
    expect(bar.el.querySelector(".dd-file-icon svg")?.getAttribute("data-icon")).toBe("image");
    bar.sync({ ...chrome("pdf", "live") });
    expect(bar.el.querySelector(".dd-tab")).toBeNull();
  });

  it("writes the tab order after a drag", () => {
    const order: string[][] = [];
    const bar = new Toolbar(elementFactory(document), {
      ...actions(),
      reorderTabs: (ids) => { order.push([...ids]); },
    }, "#fff59d");
    bar.sync({
      ...chrome("pdf", "live"),
      tabs: [
        { id: "a", name: "notes.pdf", format: "pdf", active: true },
        { id: "b", name: "shot.png", format: "png", active: false },
      ],
    });
    const [first, second] = [...bar.el.querySelectorAll<HTMLElement>(".dd-tab")];
    second!.dispatchEvent(new Event("dragstart", { bubbles: true }));
    first!.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    second!.dispatchEvent(new Event("dragend", { bubbles: true }));
    expect(order.at(-1)).toEqual(["b", "a"]);
  });
});

describe("close file", () => {
  it("closes a clean file, and asks before discarding changes", () => {
    let closed = 0;
    const bar = new Toolbar(elementFactory(document), { ...actions(), closeFile: () => { closed += 1; } }, "#fff59d");
    const button = bar.el.querySelector<HTMLButtonElement>('[data-menu-panel="file"] [data-action="close"]')!;
    expect(button.querySelector("svg")?.getAttribute("data-icon")).toBe("x");
    button.click();
    expect(closed).toBe(1);
    bar.sync({ ...chrome("pdf", "live"), info: { ...chrome("pdf", "live").info!, canUndo: true } });
    button.click();
    expect(closed).toBe(1);
    expect(bar.el.querySelector<HTMLElement>(".dd-close-dialog")?.hidden).toBe(false);
    bar.el.querySelector<HTMLButtonElement>('[data-action="close-discard"]')!.click();
    expect(closed).toBe(2);
  });
});

describe("toolbar icons", () => {
  it("uses a standard symbol where one exists and keeps the words that carry the action", () => {
    const bar = new Toolbar(elementFactory(document), actions(), "#fff59d").el;
    const labeled = (action: string, name: string, glyph: string) => {
      const button = bar.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      expect(button.getAttribute("aria-label")).toBe(name);
      expect(button.querySelector("svg")?.getAttribute("data-icon")).toBe(glyph);
    };

    labeled("open", "Open", "folder");
    const closeButtons = [...bar.querySelectorAll<HTMLButtonElement>('[data-action="close"]')];
    expect(closeButtons[0]?.textContent).toContain("Close");
    expect(closeButtons.at(-1)?.querySelector("svg")?.getAttribute("data-icon")).toBe("x");
    labeled("save", "Save", "download");
    labeled("undo", "Undo", "undo");
    labeled("redo", "Redo", "redo");
    labeled("alignLeft", "Align left", "align-left");
    labeled("alignJustify", "Justify", "align-justify");
    labeled("outdent", "Decrease indent", "outdent");
    labeled("indent", "Increase indent", "indent");
    labeled("highlight", "Highlight", "highlight");
    labeled("clearHighlight", "Clear highlight", "eraser");
    labeled("comment", "Comment", "comment");
    labeled("findPrev", "Previous match", "arrow-up");
    labeled("findNext", "Next match", "arrow-down");
    labeled("fitWidth", "Fit width", "fit-width");
    labeled("fitPage", "Fit page", "fit-page");
    labeled("deselect", "Deselect", "x");

    const theme = bar.querySelector<HTMLSelectElement>("[data-action=theme]")!;
    expect(theme.getAttribute("aria-label")).toBe("Theme");
    expect([...theme.options].map((option) => option.value)).toEqual(["filedom", "filedom-dark", "paper", "ink"]);
    expect(theme.value).toBe("filedom");
    expect(bar.querySelector("[aria-label='Settings']")?.hasAttribute("hidden")).toBe(true);
    expect(bar.querySelector(".dd-theme-panel h3")?.textContent).toBe("Interface");

    expect(bar.querySelector("[data-action=bold]")?.textContent).toBe("B");
    expect(bar.querySelector("[data-action=accept-all]")).toBeNull();
    expect(bar.querySelector("[data-action=reject-all]")).toBeNull();
    expect(bar.querySelector(".dd-layout")).toBeNull();
    expect(bar.querySelector("[data-action=copy-errors]")?.textContent).toBe("Copy all");
    expect(bar.querySelector("[data-action=copy-error]")).toBeNull();
    expect(bar.querySelector("[data-action=debug-error]")).toBeNull();
    expect(bar.querySelector("details")).toBeNull();

    const full = "open-failed: PdfiumLibraryInternalError(load) https://filedom.io/api/bundles/x";
    expect(shortError(full)).toBe("open-failed: PdfiumLibraryInternalError(load)");
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.showError(full);
    const tray = toolbar.el.querySelector<HTMLElement>('[data-activity-tray="errors"]')!;
    expect(toolbar.el.querySelector(".dd-error-badge")?.textContent).toBe("1");
    expect(toolbar.el.querySelector<HTMLElement>(".dd-error-badge")?.hidden).toBe(false);
    expect(tray.querySelector(".dd-error-row p")?.textContent).toBe("The file did not open.");
    expect(tray.textContent?.toLowerCase()).not.toContain("pdfium");
    expect(toolbar.el.querySelector(".dd-status")?.textContent).not.toContain("Pdfium");
  });
});

describe("menu bar", () => {
  it("keeps the constant bar to menus and shows a toolbar only for the selection", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.sync(chrome("docx", "live", "none"));
    const bar = toolbar.el.querySelector(".dd-toolbar-app")!;
    expect(bar.getAttribute("role")).toBe("menubar");
    expect(bar.querySelector(".dd-brand")).toBeNull();
    expect([...bar.querySelectorAll(".dd-menu-trigger")].map((el) => el.textContent)).toEqual([
      "File",
      "Edit",
      "Insert",
      "View",
      "Help",
    ]);
    expect(bar.querySelector("[data-menu='mode']")).toBeNull();
    expect(VIEWER_CSS).toContain(".dd-chrome{position:relative;z-index:30;");
    expect(VIEWER_CSS).toContain(".dd-toolbar-options{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;");
    expect(toolbar.el.querySelector<HTMLElement>(".dd-error-badge")?.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(true);

    expect(toolbar.el.querySelector<HTMLElement>(".dd-rail-left")!.hidden).toBe(false);
    const leftIcons = toolbar.el.querySelector(".dd-rail-left .dd-activity-icons")!;
    expect([...leftIcons.querySelectorAll("[data-activity]")].map((el) => el.getAttribute("aria-label"))).toEqual([
      "Text",
      "Draw",
      "Shapes",
      "Image",
    ]);
    const rightIcons = toolbar.el.querySelector(".dd-rail-right .dd-activity-icons")!;
    expect([...rightIcons.querySelectorAll("[data-activity]")].map((el) => el.getAttribute("aria-label"))).toEqual([
      "Layout",
      "Comments",
      "Tracked changes",
      "Layers",
      "Elements",
      "Errors",
    ]);
    const options = toolbar.el.querySelector(".dd-toolbar-options")!;
    expect(options.getAttribute("aria-label")).toBe("Zoom");
    expect(options.querySelector(".dd-mode")).toBeNull();
    expect(options.querySelector(".dd-mode-trigger")).toBeNull();
    expect(options.querySelector("[data-action='live']")).toBeNull();
    expect(options.querySelector("[data-icon='zoom']")).not.toBeNull();
    expect(options.querySelector(".dd-option-label")).toBeNull();
    expect(toolbar.el.querySelector("[data-menu-panel='mode']")).toBeNull();
    toolbar.sync(chrome("docx", "live", "none"));
    expect(options.querySelector("[data-action='zoomReset']")?.textContent).toBe("100%");
    expect(options.querySelector("[data-action='zoomIn']")).not.toBeNull();
    const textTray = toolbar.el.querySelector<HTMLElement>("[data-activity-tray='text']")!;
    expect(textTray.hidden).toBe(true);
    leftIcons.querySelector<HTMLButtonElement>("[data-activity='text']")!.click();
    expect(toolbar.el.querySelector<HTMLElement>(".dd-rail-left .dd-activity-panel")!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-tool-shelf")!.hidden).toBe(true);
    expect(textTray.hidden).toBe(false);
    expect(VIEWER_CSS).toContain(".dd-tool-shelf .dd-activity-title{display:none}");
    expect(textTray.querySelector("[data-action='bold']")).not.toBeNull();
    const comments = toolbar.el.querySelector<HTMLElement>("[data-activity-tray='comments']")!;
    expect(comments.hidden).toBe(true);
    rightIcons.querySelector<HTMLButtonElement>("[data-activity='comments']")!.click();
    expect(comments.hidden).toBe(false);
    expect(textTray.hidden).toBe(false);
    const viewPanel = toolbar.el.querySelector("[data-menu-panel='view']")!;
    for (const action of ["zoomOut", "zoomReset", "zoomIn", "fitWidth", "fitPage"]) {
      expect(viewPanel.querySelector(`[data-action="${action}"]`), action).toBeNull();
    }
    expect([...viewPanel.querySelectorAll(".dd-menu-folder > button .dd-menu-label")].map((el) => el.textContent)).toEqual([
      "Toolbars",
      "Mode",
    ]);
    expect(viewPanel.querySelector("[data-action='settings']")?.textContent).toContain("Settings");
    const editPanel = toolbar.el.querySelector("[data-menu-panel='edit']")!;
    expect(editPanel.querySelector("[data-action='undo']")).not.toBeNull();
    expect(editPanel.querySelector("[data-action='redo']")).not.toBeNull();
    const find = toolbar.el.querySelector<HTMLElement>(".dd-find")!;
    expect(find.hidden).toBe(true);
    expect(find.querySelector("[data-action=replace]")?.getAttribute("aria-label")).toBe("Replace with");
    expect(find.querySelector("[data-action=findPrev]")?.textContent).toContain("Previous");
    expect(find.querySelector("[data-action=findNext]")?.textContent).toContain("Next");
    expect(find.querySelector("[data-action=replaceMatch]")?.textContent).toContain("Replace");
    expect(find.querySelector("[data-action=replaceAll]")?.textContent).toContain("Replace all");
    expect(VIEWER_CSS).toMatch(/\.dd-find button\{[^}]*border:1px solid var\(--dd-border\)/);
    expect(VIEWER_CSS).toMatch(/\.dd-find button\{[^}]*background:var\(--dd-control\)/);
    expect(VIEWER_CSS).toMatch(/\.dd-find input\{[^}]*height:32px/);
    expect(find.getAttribute("role")).toBe("dialog");
    editPanel.querySelector<HTMLButtonElement>("[data-action=find]")!.click();
    expect(find.hidden).toBe(false);
    toolbar.sync({ ...chrome("docx", "live", "none"), searchQuery: "Hello", searchHitCount: 3, searchHitIndex: 1 });
    expect(find.querySelector(".dd-find-count")?.textContent).toBe("2 of 3");

    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="file"]')!.click();
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector('[data-menu-panel="file"] [data-action="save"]')).not.toBeNull();
    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="view"]')!.hidden).toBe(false);

    toolbar.sync(chrome("docx", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-selection-bar")!.hidden).toBe(false);
    expect(toolbar.el.querySelector(".dd-selection-bar [data-group='text']")).not.toBeNull();
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live", "image"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="shape"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);

    toolbar.sync(chrome("pdf", "live", "none"));
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(true);
  });

  it("keeps editing tools in a shelf and lets the icon list hide", () => {
    injectStyles(document);
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    document.body.append(toolbar.el);
    toolbar.sync(chrome("docx", "live"));
    const text = toolbar.el.querySelector<HTMLButtonElement>(".dd-rail-left [data-activity='text']")!;
    const comments = toolbar.el.querySelector<HTMLButtonElement>(".dd-rail-right [data-activity='comments']")!;
    const shelf = toolbar.el.querySelector<HTMLElement>(".dd-tool-shelf")!;
    const leftPanel = toolbar.el.querySelector<HTMLElement>(".dd-rail-left .dd-activity-panel")!;
    const rightPanel = toolbar.el.querySelector<HTMLElement>(".dd-rail-right .dd-activity-panel")!;
    const leftRail = toolbar.el.querySelector<HTMLElement>(".dd-rail-left")!;
    const rightRail = toolbar.el.querySelector<HTMLElement>(".dd-rail-right")!;
    expect(shelf.hidden).toBe(true);
    expect(leftPanel.hidden).toBe(true);
    expect(getComputedStyle(leftPanel).position).toBe("absolute");
    expect(getComputedStyle(rightPanel).position).toBe("absolute");
    const layout = toolbar.el.querySelector<HTMLButtonElement>(".dd-rail-right [data-activity='layout']")!;
    expect(getComputedStyle(text).width).toBe(getComputedStyle(layout).width);
    expect(getComputedStyle(text).height).toBe(getComputedStyle(layout).height);
    expect(getComputedStyle(text.querySelector("svg")!).width).toBe(getComputedStyle(layout.querySelector("svg")!).width);
    expect(getComputedStyle(text.querySelector("svg")!).height).toBe(getComputedStyle(layout.querySelector("svg")!).height);
    expect(getComputedStyle(text).width).toBe("56px");
    expect(leftRail.dataset.icons).toBe("shown");
    text.click();
    comments.click();
    expect(leftPanel.hidden).toBe(false);
    expect(leftPanel.querySelector<HTMLElement>('[data-activity-tray="text"]')!.hidden).toBe(false);
    expect(getComputedStyle(leftPanel.querySelector(".dd-activity-title")!).display).not.toBe("none");
    expect(shelf.hidden).toBe(true);
    text.click();
    toolbar.sync(chrome("pdf", "live"));
    for (const activity of ["text", "draw", "shapes", "image"] as const) {
      toolbar.el.querySelector<HTMLButtonElement>(`.dd-rail-left [data-activity='${activity}']`)!.click();
      expect(leftPanel.hidden, activity).toBe(false);
      expect(leftPanel.querySelector<HTMLElement>(`[data-activity-tray="${activity}"]`)!.hidden, activity).toBe(false);
    }
    expect(text.getAttribute("aria-pressed")).toBe("false");
    expect(toolbar.el.querySelector<HTMLButtonElement>(".dd-rail-left [data-activity='image']")!.getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(rightPanel.hidden).toBe(false);
    expect(getComputedStyle(leftRail).width).toBe("64px");
    expect(getComputedStyle(rightRail).width).toBe("64px");
    const leftTab = leftRail.querySelector<HTMLButtonElement>("[data-rail-tab]")!;
    const rightTab = rightRail.querySelector<HTMLButtonElement>("[data-rail-tab]")!;
    expect(leftTab.nextElementSibling).toBe(leftRail.querySelector(".dd-activity-icons"));
    expect(rightTab.nextElementSibling).toBe(rightRail.querySelector(".dd-activity-icons"));
    expect(getComputedStyle(leftTab).height).toBe("22px");
    expect(VIEWER_CSS).toContain(".dd-rail .dd-rail-tab{display:flex;align-items:center;justify-content:center;flex:none;width:100%;height:22px");
    expect(VIEWER_CSS).toContain("color:var(--dd-accent)");
    expect(getComputedStyle(leftRail.querySelector(".dd-activity-icons")!).flexGrow).toBe("1");
    leftTab.click();
    expect(leftRail.dataset.icons).toBe("hidden");
    expect(getComputedStyle(leftRail.querySelector(".dd-activity-icons")!).display).toBe("none");
    expect(shelf.hidden).toBe(true);
    leftRail.querySelector<HTMLButtonElement>("[data-rail-tab]")!.click();
    expect(leftRail.dataset.icons).toBe("shown");
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(rightPanel.hidden).toBe(true);
    toolbar.destroy();
    toolbar.el.remove();
  });
});

describe("nested menus", () => {
  it("opens beside the parent menu instead of inside its scroll box", () => {
    injectStyles(document);
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    document.body.append(toolbar.el);
    const appRule = VIEWER_CSS.match(/\.dd-app-menu\{[^}]*\}/)?.[0] ?? "";
    expect(appRule).toContain("overflow:visible");
    expect(appRule).not.toContain("overflow:auto");
    expect(VIEWER_CSS).toContain(".dd-menu.dd-menu-nested{position:absolute;inset-inline-start:calc(100% - 4px)");
    expect(VIEWER_CSS).toContain(".dd-menu-folder>.dd-menu-command::after");

    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    const parent = toolbar.el.querySelector<HTMLElement>('[data-menu-panel="view"]')!;
    expect(getComputedStyle(parent).overflow).toBe("visible");
    const folder = toolbar.el.querySelector<HTMLButtonElement>(".dd-menu-folder button")!;
    folder.click();
    const nested = toolbar.el.querySelector<HTMLElement>(".dd-menu-nested")!;
    expect(nested.hidden).toBe(false);
    expect(folder.getAttribute("aria-expanded")).toBe("true");
    expect(getComputedStyle(nested).position).toBe("fixed");
    expect(nested.querySelectorAll("input[type=checkbox]").length).toBeGreaterThan(0);
    expect(nested.textContent).toContain("Comments");
    expect(nested.textContent).toContain("Elements");
    expect(nested.textContent).not.toContain("Trays");
    let node: HTMLElement | null = nested;
    while (node && node !== toolbar.el) {
      const overflow = getComputedStyle(node).overflow;
      expect(overflow, node.className).not.toBe("auto");
      expect(overflow, node.className).not.toBe("hidden");
      node = node.parentElement;
    }

    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    expect(nested.hidden).toBe(true);
    expect(folder.getAttribute("aria-expanded")).toBe("false");
    toolbar.destroy();
    toolbar.el.remove();
  });

  it("keeps a nested menu inside the window", () => {
    const wide = nestedMenuBox({ top: 40, left: 20, right: 160 }, { width: 180, height: 70 }, { width: 800, height: 600 });
    expect(wide.left).toBe(156);
    expect(wide.top).toBe(40);

    const narrow = nestedMenuBox({ top: 40, left: 300, right: 460 }, { width: 180, height: 70 }, { width: 500, height: 400 });
    expect(narrow.left).toBeGreaterThanOrEqual(8);
    expect(narrow.left + 180).toBeLessThanOrEqual(492);
    expect(narrow.left).toBe(124);

    const low = nestedMenuBox({ top: 360, left: 20, right: 160 }, { width: 180, height: 80 }, { width: 800, height: 400 });
    expect(low.top + 80).toBeLessThanOrEqual(392);
  });
});

describe("settings", () => {
  it("opens a large centered dialog with every setting in a category", () => {
    let theme = "";
    let mode = "";
    let layout = "";
    let help = false;
    let locked = false;
    const hidden: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setThemePreset: (id) => {
          theme = id;
        },
        setViewMode: (next) => {
          mode = next;
        },
        setDisplayLayout: (next) => {
          layout = next;
        },
        setHelp: (on) => {
          help = on;
        },
        lockToolbars: (on) => {
          locked = on;
        },
        setToolbarVisible: (id, visible) => {
          if (visible) {
            const index = hidden.indexOf(id);
            if (index >= 0) hidden.splice(index, 1);
          } else hidden.push(id);
        },
      },
      "#fff59d",
    );
    const dialog = toolbar.el.querySelector<HTMLElement>(".dd-settings-dialog")!;
    expect(dialog.hidden).toBe(true);
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(VIEWER_CSS).toContain(
      ".dd-settings-dialog{position:fixed;z-index:80;inset:0;display:flex;align-items:center;justify-content:center;",
    );
    expect(VIEWER_CSS).toContain("width:min(64rem,100%);height:min(42rem,calc(100vh - 3rem))");

    toolbar.el.querySelector<HTMLButtonElement>("[data-action=settings]")!.click();
    expect(dialog.hidden).toBe(false);
    expect([...dialog.querySelectorAll("[data-settings-tab]")].map((tab) => tab.textContent)).toEqual([
      "Appearance",
      "Toolbars",
      "Editing",
      "Layout",
    ]);
    const appearance = dialog.querySelector<HTMLElement>("[data-settings-panel=appearance]")!;
    expect(appearance.hidden).toBe(false);
    expect([...appearance.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual([
      "Theme",
      "Interface",
      "Document",
    ]);
    expect(dialog.querySelector("[data-settings-panel=toolbars]")?.hasAttribute("hidden")).toBe(true);
    const palette = appearance.querySelector<HTMLSelectElement>("[data-action=theme]")!;
    palette.value = "ink";
    palette.dispatchEvent(new Event("change"));
    expect(theme).toBe("ink");

    dialog.querySelector<HTMLButtonElement>("[data-settings-tab=toolbars]")!.click();
    const toolbars = dialog.querySelector<HTMLElement>("[data-settings-panel=toolbars]")!;
    expect(appearance.hidden).toBe(true);
    expect(toolbars.hidden).toBe(false);
    expect(dialog.querySelector<HTMLButtonElement>("[data-settings-tab=toolbars]")!.getAttribute("aria-selected")).toBe(
      "true",
    );
    const lock = toolbars.querySelector<HTMLInputElement>("[data-action=lockToolbars]")!;
    lock.checked = true;
    lock.dispatchEvent(new Event("change"));
    expect(locked).toBe(true);
    const file = toolbars.querySelector<HTMLInputElement>('input[data-toolbar-id="file"]')!;
    file.checked = false;
    file.dispatchEvent(new Event("change"));
    expect(hidden).toEqual(["file"]);
    expect(toolbars.textContent).toContain("Comments");
    expect(toolbars.textContent).toContain("Elements");

    dialog.querySelector<HTMLButtonElement>("[data-settings-tab=editing]")!.click();
    const editing = dialog.querySelector<HTMLElement>("[data-settings-panel=editing]")!;
    expect([...editing.querySelectorAll("[role=radio]")].map((item) => item.textContent)).toEqual([
      "Live",
      "Track changes",
      "View only",
    ]);
    editing.querySelector<HTMLButtonElement>("[data-action=track]")!.click();
    expect(mode).toBe("track");
    const helpInput = editing.querySelector<HTMLInputElement>("[data-setting=help]")!;
    helpInput.checked = true;
    helpInput.dispatchEvent(new Event("change"));
    expect(help).toBe(true);

    dialog.querySelector<HTMLButtonElement>("[data-settings-tab=layout]")!.click();
    const layouts = dialog.querySelector<HTMLElement>("[data-settings-panel=layout]")!;
    expect([...layouts.querySelectorAll("[data-layout]")].map((item) => item.textContent)).toEqual([
      "Numbered",
      "Paginated",
      "Frame",
    ]);
    expect(layouts.querySelector("[data-layout=numbered] svg")?.getAttribute("data-icon")).toBe("numbered");
    expect(layouts.querySelector("[data-layout=paginated] svg")?.getAttribute("data-icon")).toBe("pages");
    expect(layouts.querySelector("[data-layout=frame] svg")?.getAttribute("data-icon")).toBe("frame");
    expect(layouts.querySelector("[data-layout=numbered]")?.classList.contains("dd-layout-choice")).toBe(true);
    expect(toolbar.el.querySelector("[data-activity-tray=layout] [data-layout=frame]")?.classList.contains("dd-layout-choice")).toBe(
      true,
    );
    layouts.querySelector<HTMLButtonElement>("[data-layout=frame]")!.click();
    expect(layout).toBe("frame");

    toolbar.sync({
      ...chrome("docx", "track"),
      helpOn: true,
      toolbarsLocked: true,
      displayLayout: "frame",
      hiddenGroups: ["file"],
    });
    expect(helpInput.checked).toBe(true);
    expect(lock.checked).toBe(true);
    expect(editing.querySelector("[data-action=track]")?.getAttribute("aria-checked")).toBe("true");
    expect(layouts.querySelector("[data-layout=frame]")?.getAttribute("aria-pressed")).toBe("true");
    expect(layouts.querySelector("[data-layout=frame]")?.getAttribute("aria-checked")).toBe("true");
    expect(file.checked).toBe(false);
    expect(toolbar.el.querySelector<HTMLInputElement>('.dd-menu-nested input[data-toolbar-id="file"]')!.checked).toBe(
      false,
    );

    dialog.querySelector<HTMLElement>(".dd-close-card")!.click();
    expect(dialog.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(dialog.hidden).toBe(true);
    toolbar.el.querySelector<HTMLButtonElement>("[data-action=settings]")!.click();
    expect(dialog.hidden).toBe(false);
    expect(appearance.hidden).toBe(false);
    dialog.click();
    expect(dialog.hidden).toBe(true);
  });
});

describe("zoom percentage", () => {
  it("opens a field and applies a typed zoom inside 10% and 500%", () => {
    const zooms: number[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      { ...actions(), setZoom: (zoom) => zooms.push(zoom) },
      "#fff59d",
    );
    toolbar.sync({ ...chrome("docx", "live"), zoom: 1.25 });
    const button = toolbar.el.querySelector<HTMLButtonElement>("[data-action=zoomReset]")!;
    const field = toolbar.el.querySelector<HTMLInputElement>("[data-zoom-edit]")!;
    expect(button.textContent).toBe("125%");
    expect(field.hidden).toBe(true);
    expect(field.getAttribute("aria-label")).toBe("Zoom percent, 10 to 500");

    button.click();
    expect(button.hidden).toBe(true);
    expect(field.hidden).toBe(false);
    expect(field.value).toBe("125%");
    field.value = "80";
    toolbar.sync({ ...chrome("docx", "live"), zoom: 2 });
    expect(field.hidden).toBe(false);
    expect(field.value).toBe("80");
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(zooms).toEqual([]);
    expect(field.hidden).toBe(true);
    expect(button.hidden).toBe(false);
    expect(button.textContent).toBe("200%");

    button.click();
    field.value = "250%";
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(zooms).toEqual([2.5]);
    expect(field.hidden).toBe(true);

    button.click();
    field.value = "1000";
    field.dispatchEvent(new Event("blur"));
    expect(zooms).toEqual([2.5, 5]);

    button.click();
    field.value = "1";
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(zooms).toEqual([2.5, 5, 0.1]);

    button.click();
    field.value = "nope";
    field.dispatchEvent(new Event("blur"));
    expect(zooms).toEqual([2.5, 5, 0.1]);
    expect(button.hidden).toBe(false);
  });
});

describe("modes and contextual toolbars", () => {
  it("only offers live, track, and view, and swaps text vs image toolbars", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    expect(toolbar.el.querySelector('[data-action="mode"]')).toBeNull();
    expect(toolbar.el.querySelector('[data-menu="mode"]')).toBeNull();
    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    const mode = [...toolbar.el.querySelectorAll<HTMLButtonElement>(".dd-menu-folder > button")].find((button) =>
      button.textContent?.includes("Mode"),
    )!;
    mode.click();
    const modeMenu = mode.parentElement!.querySelector(".dd-menu-nested")!;
    expect(modeMenu.hidden).toBe(false);
    expect([...modeMenu.querySelectorAll(".dd-menu-radio")].map((item) => item.textContent?.trim())).toEqual([
      "Live",
      "Track changes",
      "View only",
    ]);

    toolbar.sync(chrome("pdf", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live", "image"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-group="image"] [data-action="replaceImage"]')!.disabled).toBe(
      false,
    );
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-group="image"] [data-action="deleteElement"]')!.disabled).toBe(
      false,
    );
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="deselect"]')!.disabled).toBe(false);

    toolbar.sync(chrome("pdf", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="highlight"]')!.disabled).toBe(true);

    toolbar.sync({ ...chrome("pdf", "live", "text"), hasSelection: true });
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="highlight"]')!.disabled).toBe(false);
  });

  it("hides insert kinds the adapter cannot place and disables editing in view mode", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.sync(chrome("docx", "live"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="insertImage"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="insertCode"]')!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(true);

    toolbar.sync(chrome("docx", "view"));
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="insertImage"]')!.disabled).toBe(true);
  });

  it("shows help hints when help is on and View can hide a toolbar", () => {
    let help = false;
    let hidden: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setHelp: (on) => (help = on),
        setToolbarVisible: (id, visible) => {
          hidden = visible ? hidden.filter((g) => g !== id) : [...hidden, id];
        },
      },
      "#fff59d",
    );
    toolbar.sync({ ...chrome("docx", "live"), helpOn: true });
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="open"]')!.title).toMatch(/Open/);
    toolbar.sync({ ...chrome("docx", "live"), helpOn: false });
    toolbar.el.querySelector<HTMLButtonElement>('[data-action="help"]')!.click();
    expect(help).toBe(true);
    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    toolbar.el.querySelector<HTMLButtonElement>(".dd-menu-folder button")!.click();
    const check = toolbar.el.querySelector<HTMLInputElement>("input[data-toolbar-id]")!;
    check.checked = false;
    check.dispatchEvent(new Event("change"));
    expect(hidden.length).toBeGreaterThan(0);
  });

  it("lists comments, elements, layers, and track changes as toolbars", () => {
    const hidden: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setToolbarVisible: (id, visible) => {
          if (visible) {
            const index = hidden.indexOf(id);
            if (index >= 0) hidden.splice(index, 1);
          } else hidden.push(id);
        },
      },
      "#fff59d",
    );
    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    toolbar.el.querySelector<HTMLButtonElement>(".dd-menu-folder button")!.click();
    const menu = toolbar.el.querySelector(".dd-menu-nested")!;
    expect(menu.textContent).not.toContain("Trays");
    expect(menu.querySelector("input[data-tray]")).toBeNull();
    const comments = menu.querySelector<HTMLInputElement>('input[data-toolbar-id="comments"]')!;
    const elements = menu.querySelector<HTMLInputElement>('input[data-toolbar-id="elements"]')!;
    expect(comments.checked).toBe(true);
    expect(elements.checked).toBe(true);
    comments.checked = false;
    comments.dispatchEvent(new Event("change"));
    expect(hidden).toEqual(["comments"]);
    const rail = toolbar.el.querySelector<HTMLElement>(".dd-rail-right")!;
    document.body.append(rail);
    toolbar.sync({ ...chrome("pdf", "track"), hiddenGroups: ["comments", "elements", "group", "trackHistory"] });
    expect(toolbar.el.querySelector('[data-activity="comments"]')).toBeNull();
    expect(rail.querySelector<HTMLElement>('[data-activity="comments"]')!.hidden).toBe(true);
    expect(rail.querySelector<HTMLElement>('[data-activity="elements"]')!.hidden).toBe(true);
    expect(rail.querySelector<HTMLElement>('[data-activity="layers"]')!.hidden).toBe(true);
    expect(rail.querySelector<HTMLElement>('[data-activity="history"]')!.hidden).toBe(true);
    rail.remove();
    expect(comments.checked).toBe(false);
  });
});

describe("text format follows the selection", () => {
  it("preselects a shared font, size, and color, and leaves a mixed face blank", () => {
    const fonts: string[] = [];
    const sizes: number[] = [];
    const colors: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      { ...actions(), setFont: (font) => fonts.push(font), setSize: (size) => sizes.push(size), setColor: (color) => colors.push(color) },
      "#fff59d",
    );
    toolbar.sync({
      ...chrome("pdf", "live", "text"),
      hasSelection: true,
      font: "Helvetica",
      sizePt: 14,
      color: "#c00000",
    });
    const font = toolbar.el.querySelector<HTMLSelectElement>('[data-action="font"]')!;
    const size = toolbar.el.querySelector<HTMLSelectElement>('[data-action="size"]')!;
    const color = toolbar.el.querySelector<HTMLInputElement>('[data-action="color"]')!;
    expect(font.value).toBe("Helvetica");
    expect(size.value).toBe("14");
    expect(color.value).toBe("#c00000");
    expect(fonts).toEqual([]);
    expect(sizes).toEqual([]);
    expect(colors).toEqual([]);

    toolbar.sync({ ...chrome("pdf", "live", "text"), hasSelection: true, sizePt: 13.5, color: "#000000" });
    expect(size.value).toBe("13.5");
    expect(font.selectedIndex).toBe(-1);
    expect(color.value).toBe("#000000");

    expect(shownTextFormat([{ font: "Times New Roman", fontSizePt: 18, color: "#112233" }], undefined)).toEqual({
      font: "Times New Roman",
      sizePt: 18,
      color: "#112233",
    });
    expect(
      shownTextFormat(
        [
          { font: "Helvetica", fontSizePt: 12 },
          { font: "Times New Roman", fontSizePt: 12, color: "#ff0000" },
        ],
        undefined,
      ),
    ).toEqual({ font: undefined, sizePt: 12, color: undefined });
    expect(shownTextFormat([{ font: "Helvetica", fontSizePt: 12 }], { font: "Georgia", sizePt: 20 })).toMatchObject({
      font: "Georgia",
      sizePt: 20,
      color: "#000000",
    });
  });
});

describe("kind toolbars", () => {
  it("shows audio controls for an mp3 and hides them for a pdf", () => {
    let played = 0;
    const sink = actions();
    sink.playMedia = () => {
      played += 1;
    };
    const toolbar = new Toolbar(elementFactory(document), sink, "#fff59d");
    const audio = chrome("mp3", "view", "text");
    audio.info!.capabilities = {
      editText: false,
      editStructure: false,
      formatText: false,
      formatParagraph: false,
      flowEmbeds: false,
      transform: false,
      layers: false,
      insert: false,
    };
    toolbar.sync(audio);
    const audioGroup = toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!;
    const play = audioGroup.querySelector<HTMLButtonElement>('[data-action="playMedia"]')!;
    expect(audioGroup.hidden).toBe(false);
    expect(play.disabled).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="video"]')!.hidden).toBe(true);
    const leftRail = toolbar.el.querySelector<HTMLElement>(".dd-rail-left")!;
    expect(leftRail.hidden).toBe(false);
    expect(
      [...leftRail.querySelectorAll<HTMLElement>(".dd-activity-icons [data-activity]")].map((el) => ({
        id: el.dataset.activity,
        hidden: el.hidden,
      })),
    ).toEqual([
      { id: "text", hidden: false },
      { id: "draw", hidden: false },
      { id: "shapes", hidden: false },
      { id: "image", hidden: false },
    ]);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(false);
    play.click();
    expect(played).toBe(1);

    toolbar.sync(chrome("pdf", "live", "none"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!.hidden).toBe(true);
  });

  it("shows the sheet toolbar for csv and the archive toolbar for zip", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    const sheet = chrome("csv", "view");
    sheet.info!.capabilities.editText = false;
    sheet.info!.capabilities.formatText = false;
    toolbar.sync(sheet);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="sheet"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!.hidden).toBe(true);

    toolbar.sync(chrome("zip", "view"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="archive"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="sheet"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="email"]')!.hidden).toBe(true);
  });
});

describe("history panel replaces accept/reject chrome", () => {
  it("restores a history row without accept-all buttons", () => {
    const restored: string[] = [];
    const panel = new HistoryPanel(elementFactory(document), {
      restoreHistory: (id) => restored.push(id),
      revertHistory() {},
    });
    panel.render([{ id: "1", label: "Typed hi" }]);
    panel.el.querySelector<HTMLButtonElement>(".dd-history-label")!.click();
    expect(restored).toEqual(["1"]);
  });
});

describe("errors rail", () => {
  it("counts errors on the review icon and copies one or all with context", async () => {
    const trays: { id: string; visible: boolean }[] = [];
    const contexts = ["first context from sdk/packages/core/src/viewer.ts", "second context from wasm/crates/open/src/pdf.rs"];
    let calls = 0;
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setTrayVisible: (id, visible) => trays.push({ id, visible }),
        debugReport: () => contexts[calls++] ?? "",
      },
      "#fff59d",
    );
    const icon = toolbar.el.querySelector<HTMLButtonElement>('[data-activity="errors"]')!;
    expect(icon.querySelector("svg")?.getAttribute("data-icon")).toBe("alert");
    expect(icon.querySelector<HTMLElement>(".dd-error-badge")?.hidden).toBe(true);
    expect(toolbar.el.querySelector('[data-activity-tray="errors"] [data-action="copy-errors"]')).toBeInstanceOf(HTMLButtonElement);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="copy-errors"]')?.disabled).toBe(true);

    toolbar.el.querySelector<HTMLButtonElement>('[data-activity="comments"]')!.click();
    icon.click();
    expect(trays).toEqual([
      { id: "comments", visible: true },
      { id: "comments", visible: false },
    ]);
    expect(toolbar.el.querySelector<HTMLElement>('[data-activity-tray="errors"]')?.hidden).toBe(false);

    toolbar.showError("open-failed: PdfiumLibraryInternalError(load)", "notes.pdf");
    toolbar.showError("unsupported: text formatting", "notes.pdf");
    const badge = icon.querySelector<HTMLElement>(".dd-error-badge")!;
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("2");
    expect(icon.getAttribute("aria-label")).toBe("Errors, 2");
    const rows = [...toolbar.el.querySelectorAll(".dd-error-row p")].map((row) => row.textContent);
    expect(rows).toEqual(["The file did not open.", "This file cannot do that."]);
    expect(toolbar.el.querySelector('[data-activity-tray="errors"]')?.textContent?.toLowerCase()).not.toMatch(/pdfium|wasm\/|sdk\/packages/);

    const written: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => void written.push(text) },
    });
    const copies = [...toolbar.el.querySelectorAll<HTMLButtonElement>('[data-action="copy-error"]')];
    copies[0]?.click();
    await Promise.resolve();
    expect(written[0]).toContain("Summary: The file did not open.");
    expect(written[0]).toContain("first context from sdk/packages/core/src/viewer.ts");
    expect(written[0]).not.toContain("second context");
    toolbar.el.querySelector<HTMLButtonElement>('[data-action="copy-errors"]')!.click();
    await Promise.resolve();
    expect(written[1]).toContain("There are 2 errors");
    expect(written[1]).toContain("first context from sdk/packages/core/src/viewer.ts");
    expect(written[1]).toContain("second context from wasm/crates/open/src/pdf.rs");
    expect(written[1]).toContain("# Error 1 of 2");
    expect(written[1]).toContain("# Error 2 of 2");

    toolbar.clearError();
    toolbar.setDocumentNotes(["Listing truncated at 400 entries.", "Sheet preview truncated."], "archive.zip");
    toolbar.showError("unsupported: text formatting", "archive.zip");
    expect([...toolbar.el.querySelectorAll(".dd-error-row p")].map((row) => row.textContent)).toEqual([
      "Listing truncated at 400 entries.",
      "Sheet preview truncated.",
      "This file cannot do that.",
    ]);
    expect(badge.textContent).toBe("3");
    toolbar.clearError();
    expect(badge.hidden).toBe(true);
    expect(toolbar.el.querySelector(".dd-error-row")).toBeNull();
    expect(toolbar.el.querySelector('[data-activity-tray="errors"]')?.textContent).toContain("No errors");
    expect(toolbar.el.querySelector<HTMLElement>('[data-activity-tray="errors"]')?.hidden).toBe(true);
  });
});
