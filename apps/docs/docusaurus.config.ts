import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";
import exampleSourcesPlugin from "./src/plugins/example-sources";
import tailwindPlugin from "./src/plugins/tailwind";

const GITHUB = "https://github.com/domdoc-io/domdoc-sdk";
const GA_MEASUREMENT_ID = "G-8GT6Y9JSNK";

const config: Config = {
  title: "domdoc SDK",
  tagline: "Embed the shared document editor",
  url: "https://domdoc.io",
  baseUrl: "/sdk-docs/",
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
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "domdoc SDK",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { to: "/playground/", label: "Playground", position: "left" },
        { to: "/licensing/", label: "Licensing", position: "left" },
        // Raw HTML: a normal href of "/" is prefixed with /sdk-docs/.
        {
          type: "html",
          position: "right",
          value: '<a class="navbar__link" href="/">domdoc Cloud</a>',
        },
        { href: GITHUB, label: "GitHub", position: "right" },
      ],
    },
    footer: {
      links: [
        {
          title: "Docs",
          items: [
            { label: "Install", to: "/install/" },
            { label: "Files", to: "/files/" },
            { label: "Events", to: "/events/" },
            { label: "Components", to: "/components/" },
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
            { html: '<a class="footer__link-item" href="/">domdoc Cloud</a>' },
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
