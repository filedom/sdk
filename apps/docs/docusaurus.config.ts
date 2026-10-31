import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";
import exampleSourcesPlugin from "./src/plugins/example-sources";
import tailwindPlugin from "./src/plugins/tailwind";

const GITHUB = "https://github.com/domdoc-io/domdoc-sdk";

const config: Config = {
  title: "domdoc SDK",
  tagline: "Embed the shared document editor",
  url: "https://domdoc.io",
  baseUrl: "/sdk-docs/",
  trailingSlash: true,
  onBrokenLinks: "throw",
  markdown: { hooks: { onBrokenMarkdownLinks: "warn" } },
  i18n: { defaultLocale: "en", locales: ["en"] },
  plugins: [tailwindPlugin, exampleSourcesPlugin],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "domdoc SDK",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { type: "docSidebar", sidebarId: "frameworks", position: "left", label: "Frameworks" },
        { to: "/playground/", label: "Playground", position: "left" },
        { to: "/licensing/", label: "Licensing", position: "left" },
        { href: "https://domdoc.io/", label: "domdoc Cloud", position: "right" },
        { href: GITHUB, label: "GitHub", position: "right" },
      ],
    },
    footer: {
      links: [
        {
          title: "Docs",
          items: [
            { label: "Install", to: "/install/" },
            { label: "UI kit", to: "/ui-kit/" },
            { label: "Frameworks", to: "/frameworks/react/" },
          ],
        },
        {
          title: "Try it",
          items: [
            { label: "Playground", to: "/playground/" },
            { label: "Licensing", to: "/licensing/" },
          ],
        },
        {
          title: "More",
          items: [
            { label: "domdoc Cloud", href: "https://domdoc.io/" },
            { label: "GitHub", href: GITHUB },
          ],
        },
      ],
      copyright: `MIT licensed. © ${new Date().getFullYear()} domdoc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
