import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";
import exampleSourcesPlugin from "./src/plugins/example-sources";
import tailwindPlugin from "./src/plugins/tailwind";

const GITHUB = "https://github.com/filedom/sdk";
const GA_MEASUREMENT_ID = "G-8GT6Y9JSNK";

const config: Config = {
  title: "FileDOM SDK",
  tagline: "Embed the shared document editor",
  url: "https://filedom.io",
  baseUrl: "/sdk/docs/",
  // Same Google tag as the rest of the site. Docs HTML is served as-is, outside the Next layout.
  headTags: [
    {
      tagName: "script",
      attributes: {
        async: true,
        src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
      },
    },
    {
      tagName: "script",
      attributes: {},
      innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${GA_MEASUREMENT_ID}');`,
    },
  ],
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
    image: "https://filedom.io/opengraph-image",
    metadata: [{ name: "twitter:card", content: "summary_large_image" }],
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      items: [
        {
          type: "html",
          position: "left",
          value:
            '<a class="navbar__brand" href="/"><img class="navbar__logo" src="/mark.png" alt="" width="23" height="23"><b class="navbar__title">FileDOM</b><span class="navbar__product">SDK</span></a>',
        },
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        {
          type: "html",
          position: "left",
          value: '<a class="navbar__link" href="/sdk/integrations">Integrations</a>',
        },
        { to: "/licensing/", label: "Licensing", position: "left" },
        // Raw HTML so this stays on the cloud site. A normal link would be prefixed with /sdk/docs/.
        {
          type: "html",
          position: "right",
          value: '<a class="navbar__link" href="/cloud">FileDOM Cloud</a>',
        },
        {
          type: "html",
          position: "right",
          value:
            '<a class="navbar__link" href="https://github.com/filedom/sdk" target="_blank" rel="noreferrer" aria-label="GitHub"><svg class="github-mark" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>',
        },
      ],
    },
    footer: {
      links: [
        {
          title: "Product",
          items: [
            { label: "FileDOM", href: "/" },
            { label: "Cloud", href: "/cloud" },
            { label: "Pricing", href: "/pricing" },
            { label: "Library", href: "/library" },
          ],
        },
        {
          title: "SDK",
          items: [
            { label: "SDK", href: "/sdk" },
            { label: "Docs", to: "/" },
            { label: "Integrations", href: "/sdk/integrations" },
            { label: "Licence", href: "/sdk/licence" },
            { label: "GitHub", href: GITHUB },
          ],
        },
        {
          title: "Legal",
          items: [
            { label: "Terms", href: "/legal/terms" },
            { label: "Privacy", href: "/legal/privacy" },
            { label: "Cookies", href: "/legal/cookies" },
          ],
        },
      ],
      copyright: "© 2026 FileDOM",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
