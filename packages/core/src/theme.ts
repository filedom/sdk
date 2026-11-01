/**
 * Chrome themes. High contrast is its own palette, not a filter on light or dark.
 *
 * The cascade matches EmbedPDF: a `--dd-*` variable set on the mount element, or
 * any ancestor, wins over `theme.tokens`, which wins over the mode's defaults.
 * One accent tints the pressed control and the text selection. `system` follows
 * the OS and switches when the user changes it.
 */

/** A concrete palette. `system` is not one of these; it resolves to light or dark. */
export type ThemeName = "light" | "dark" | "high-contrast-light" | "high-contrast-dark";

export type ThemePreference = ThemeName | "system";

/**
 * Public tokens. Each name is the CSS variable `--dd-<var>` (see {@link TOKEN_VAR}).
 * `surface` is the toolbar and side panel; `canvas` is the page well; `page` is the paper.
 */
export const THEME_TOKENS = [
  "accent",
  "background",
  "surface",
  "surface-raised",
  "text",
  "text-muted",
  "border",
  "hover",
  "canvas",
  "page",
  "radius",
  "font",
  "ins",
  "del",
  "search",
  "search-active",
  "control",
  "control-down",
  "field",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/** Token values by name. Each value is a CSS value: `{ surface: "#fbfaf7", radius: "2px" }`. */
export type ThemeTokens = { readonly [Name in ThemeToken]?: string };

export interface ThemeConfig {
  /** `system` follows the OS. Omitted means light. */
  preference?: ThemePreference;
  /** Accent in every mode. The same as `tokens.accent`, which wins when both are set. */
  accent?: string;
  /** Token values for every mode, over the mode's defaults. */
  tokens?: ThemeTokens;
  /** Token values for dark mode only, over `tokens`. High contrast keeps its own palette. */
  dark?: ThemeTokens;
}

/** CSS variable suffix for a token. `surface` is `--dd-panel`. */
export const TOKEN_VAR: { readonly [Name in ThemeToken]: string } = {
  accent: "accent",
  background: "bg",
  surface: "panel",
  "surface-raised": "raised",
  text: "fg",
  "text-muted": "muted",
  border: "border",
  hover: "hover",
  canvas: "canvas",
  page: "page",
  radius: "radius",
  font: "font",
  ins: "ins",
  del: "del",
  search: "search",
  "search-active": "search-active",
  control: "control",
  "control-down": "control-down",
  field: "field",
};

const FONT = '"Source Sans 3","Avenir Next","Segoe UI",sans-serif';

/**
 * Mode defaults. `control-down` is omitted for light and dark so the pressed
 * control is a tint of the accent; high contrast sets a solid value.
 * Text colors are the ones the a11y suite reads off the toolbar.
 */
export const THEME_DEFAULTS: {
  readonly [Mode in ThemeName]: { readonly [Name in ThemeToken]?: string };
} = {
  light: {
    accent: "#1a5f4a",
    background: "#f4f0e8",
    surface: "#f4f0e8",
    "surface-raised": "#fff",
    text: "#1a1916",
    "text-muted": "#5e584e",
    border: "rgba(26, 25, 22, 0.14)",
    hover: "#ebe4d6",
    canvas: "#ebe4d6",
    page: "#fff",
    radius: "2px",
    font: FONT,
    ins: "#1565c0",
    del: "#c62828",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#f6f8fa",
    field: "#fff",
  },
  dark: {
    accent: "#7dbaa4",
    background: "#141311",
    surface: "#1c1b18",
    "surface-raised": "#242220",
    text: "#f3efe6",
    "text-muted": "#a39c90",
    border: "rgba(243, 239, 230, 0.14)",
    hover: "#2a2825",
    canvas: "#1a1916",
    page: "#fff",
    radius: "2px",
    font: FONT,
    ins: "#79b8ff",
    del: "#ff7b72",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#21262d",
    field: "#0d1117",
  },
  "high-contrast-light": {
    accent: "#00e",
    background: "#fff",
    surface: "#fff",
    "surface-raised": "#fff",
    text: "#000",
    "text-muted": "#000",
    border: "#000",
    hover: "#e5e5e5",
    canvas: "#fff",
    page: "#fff",
    radius: "2px",
    font: FONT,
    ins: "#000",
    del: "#000",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#fff",
    "control-down": "#000",
    field: "#fff",
  },
  "high-contrast-dark": {
    accent: "#ff0",
    background: "#000",
    surface: "#000",
    "surface-raised": "#000",
    text: "#fff",
    "text-muted": "#fff",
    border: "#fff",
    hover: "#222",
    canvas: "#000",
    page: "#fff",
    radius: "2px",
    font: FONT,
    ins: "#fff",
    del: "#fff",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#000",
    "control-down": "#ff0",
    field: "#000",
  },
};

/** Normalize the shorthand. A string is a preference; omitted is an empty config. */
export function themeConfigOf(theme: ThemePreference | ThemeConfig | undefined): ThemeConfig {
  if (typeof theme === "string") return { preference: theme };
  return theme ?? {};
}

const isThemeToken = (name: string): name is ThemeToken =>
  (THEME_TOKENS as readonly string[]).includes(name);

/** Ends a declaration or the style element. A token value is never allowed to do either. */
const UNSAFE_VALUE = /[{};<>]/;

function declarations(tokens: ThemeTokens | undefined, slot: "config" | "dark"): string {
  if (!tokens) return "";
  const parts = Object.entries(tokens).filter(([name, value]) => {
    if (value === undefined) return false;
    if (!isThemeToken(name)) {
      console.warn(`[domdoc] theme: "${name}" isn't a token, ignored`);
      return false;
    }
    if (typeof value !== "string" || value.trim() === "" || UNSAFE_VALUE.test(value)) {
      console.warn(`[domdoc] theme: ignoring the invalid value of "${name}"`);
      return false;
    }
    return true;
  });
  if (!parts.length) return "";
  return `${parts.map(([name, value]) => `--dd-${TOKEN_VAR[name as ThemeToken]}-${slot}:${value}`).join(";")};`;
}

/**
 * CSS that applies a theme's tokens on one viewer (`root` is a selector for that viewer).
 * Host variables still win: the sheet only sets the `*-config` and `*-dark` slots.
 * Empty when the theme sets no token.
 */
export function themeTokenCss(theme: ThemePreference | ThemeConfig | undefined, root: string): string {
  const { accent, tokens, dark } = themeConfigOf(theme);
  const both = declarations({ ...(accent === undefined ? {} : { accent }), ...tokens }, "config");
  const darkOnly = declarations(dark, "dark");
  return (both ? `${root}{${both}}` : "") + (darkOnly ? `${root}[data-theme="dark"]{${darkOnly}}` : "");
}

/** Copies inherited `--dd-*` values before the viewer assigns its own. */
export function themeCaptureDeclarations(): string {
  return `${THEME_TOKENS.map((token) => {
    const css = TOKEN_VAR[token];
    return `--dd-host-${css}:var(--dd-${css})`;
  }).join(";")};`;
}

/** Resolves each token: host, then dark config, then config, then the mode default. */
export function themeResolveDeclarations(): string {
  return `${THEME_TOKENS.map((token) => {
    const css = TOKEN_VAR[token];
    const tail =
      token === "control-down"
        ? `var(--dd-${css}-default,var(--dd-accent-tint))`
        : `var(--dd-${css}-default)`;
    return `--dd-${css}:var(--dd-host-${css},var(--dd-${css}-dark,var(--dd-${css}-config,${tail})))`;
  }).join(";")};`;
}

/** The mode's `--dd-*-default` values. Skips tokens that mode leaves to a derived tint. */
export function themeDefaultDeclarations(mode: ThemeName): string {
  const parts = THEME_TOKENS.flatMap((token) => {
    const value = THEME_DEFAULTS[mode][token];
    return value === undefined ? [] : [`--dd-${TOKEN_VAR[token]}-default:${value}`];
  });
  return parts.length ? `${parts.join(";")};` : "";
}

let nextViewerKey = 0;

/** A selector-safe id so two viewers on one page keep their token sheets apart. */
export function nextThemeKey(): string {
  nextViewerKey += 1;
  return `d${nextViewerKey}`;
}
