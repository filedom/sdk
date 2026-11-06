import { createRequire } from "node:module";
import path from "node:path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import tailwindcss from "@tailwindcss/postcss";

interface CssRoot {
  walkAtRules(name: string, callback: (rule: { params: string }) => void): void;
}

const THEME_IMPORT = "@filedom/ui/theme.css";

// Keeps <html class="dark"> equal to Docusaurus' data-theme so `.dark` tokens and the
// Tailwind `dark:` variant follow the navbar toggle, including before hydration.
const THEME_BOOT = `(function(){try{var s=localStorage.getItem("filedom-theme");var p=s==="light"||s==="dark"||s==="system"?s:"system";var dark=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var mode=dark?"dark":"light";var d=document.documentElement;d.setAttribute("data-theme",mode);d.classList.toggle("dark",dark);d.style.colorScheme=mode;localStorage.setItem("theme",mode);}catch(e){}})();`;

const DARK_CLASS_SYNC = `(function(){var d=document.documentElement;var current=d.getAttribute("data-theme");function s(){var mode=d.getAttribute("data-theme");d.classList.toggle("dark",mode==="dark");if((mode==="light"||mode==="dark")&&mode!==current){current=mode;try{localStorage.setItem("filedom-theme",mode);localStorage.setItem("theme",mode);}catch(e){}}}s();new MutationObserver(s).observe(d,{attributes:true,attributeFilter:["data-theme","class"]})})();`;

function themeAvailable(siteDir: string): boolean {
  try {
    createRequire(`${siteDir}/package.json`).resolve(THEME_IMPORT);
    return true;
  } catch {
    return false;
  }
}

// Points the theme import at the local fallback while @filedom/ui does not ship theme.css.
function themeFallback(siteDir: string) {
  const available = themeAvailable(siteDir);
  const fallback = path.join(siteDir, "src/css/theme-fallback.css");
  return {
    postcssPlugin: "filedom-theme-fallback",
    Once(root: CssRoot) {
      if (available) return;
      root.walkAtRules("import", (rule) => {
        rule.params = rule.params.replace(THEME_IMPORT, fallback);
      });
    },
  };
}

export default function tailwindPlugin(context: LoadContext): Plugin {
  return {
    name: "filedom-tailwind",
    configurePostCss(postcssOptions) {
      postcssOptions.plugins.unshift(themeFallback(context.siteDir), tailwindcss());
      return postcssOptions;
    },
    injectHtmlTags() {
      return {
        headTags: [
          { tagName: "script", innerHTML: THEME_BOOT },
          { tagName: "script", innerHTML: DARK_CLASS_SYNC },
        ],
      };
    },
  };
}
