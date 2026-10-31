import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  integrator: [
    "install",
    "events",
    "files",
    "modes",
    "toolbars",
    "components",
    {
      type: "category",
      label: "Frameworks",
      items: [
        "frameworks/react",
        "frameworks/preact",
        "frameworks/vue",
        "frameworks/solid",
        "frameworks/svelte",
        "frameworks/lit",
        "frameworks/angular",
        "frameworks/next",
        "frameworks/nuxt",
        "frameworks/sveltekit",
        "frameworks/astro",
      ],
    },
  ],
};

export default sidebars;
