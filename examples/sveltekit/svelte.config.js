import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** FILEDOM_BASE includes a trailing slash. SvelteKit's paths.base must not. */
function kitBase() {
  const raw = process.env.FILEDOM_BASE || "/sdk-docs/examples/sveltekit/";
  const trimmed = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** @type {import("@sveltejs/kit").Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",
      precompress: false,
      strict: false,
    }),
    paths: {
      base: kitBase(),
      relative: false,
    },
  },
};

export default config;
