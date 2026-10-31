// Shared by build-examples, build-site, and serve-examples. Node built-ins only.
// The constants mirror packages/ui/src/contracts.ts; site.test.mjs fails when they drift.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SDK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EXAMPLES_ROOT = join(SDK_ROOT, "examples");
export const DOCS_ROOT = join(SDK_ROOT, "apps", "docs");
export const DOCS_BUILD = join(DOCS_ROOT, "build");
export const DEFAULT_STAGING = join(SDK_ROOT, "dist", "examples");

export const FRAMEWORKS = ["react", "next", "preact", "vue", "nuxt", "svelte", "sveltekit", "angular", "solid", "lit", "astro"];
export const SITE_BASE = "/sdk-docs/";
export const SAMPLE_PDF_PATH = "/sdk-docs/samples/hello.pdf";
export const BUNDLES_BASE = "/api/bundles/";
export const BUNDLES_ENV = "DOMDOC_EXAMPLES_BUNDLES";
export const DEFAULT_CDN = "https://domdoc.io/api/bundles";
export const FORBIDDEN_PREFIX = "/wasm/";
/** CONTRACTS.md section 8: `serve-examples` returns 404 for `/wasm/`. */
export const FORBIDDEN_STATUS = 404;
/** Env var each example build reads for its public base path. */
export const BASE_ENV = "DOMDOC_BASE";

export function exampleBase(fw) {
  return `${SITE_BASE}examples/${fw}/`;
}

/**
 * Where each framework's build writes its static site, relative to the example
 * directory. The first candidate holding an `index.html` wins. `*` matches one
 * directory level (Angular writes `dist/<project>/browser`).
 */
export const OUTPUT_CANDIDATES = {
  react: ["dist"],
  next: ["out"],
  preact: ["dist"],
  vue: ["dist"],
  nuxt: [".output/public", "dist"],
  svelte: ["dist"],
  sveltekit: ["build"],
  angular: ["dist/*/browser", "dist/*", "dist"],
  solid: ["dist"],
  lit: ["dist"],
  astro: ["dist"],
};

export function findOutputDir(exampleDir, fw) {
  for (const pattern of OUTPUT_CANDIDATES[fw] ?? ["dist"]) {
    for (const dir of expandPattern(exampleDir, pattern)) {
      if (isFile(join(dir, "index.html"))) return dir;
    }
  }
  return null;
}

function expandPattern(base, pattern) {
  let dirs = [base];
  for (const part of pattern.split("/")) {
    const next = [];
    for (const dir of dirs) {
      if (part === "*") {
        if (!isDir(dir)) continue;
        for (const entry of readdirSync(dir).sort()) {
          if (isDir(join(dir, entry))) next.push(join(dir, entry));
        }
      } else {
        next.push(join(dir, part));
      }
    }
    dirs = next;
  }
  return dirs;
}

/** A W0 shell example whose `build` only prints a message, or that has no `build`. */
export function isPlaceholderBuild(pkg) {
  const script = pkg?.scripts?.build;
  return typeof script !== "string" || /no app yet/.test(script);
}

export function readExamplePackage(examplesRoot, fw) {
  const file = join(examplesRoot, fw, "package.json");
  if (!isFile(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

/** `--only react,vue --only svelte` (alias `--fw`) to a list of ids; empty means all. */
export function parseOnly(argv) {
  const picked = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let value;
    if (arg === "--only" || arg === "--fw") value = argv[++i];
    else if (arg.startsWith("--only=") || arg.startsWith("--fw=")) value = arg.slice(arg.indexOf("=") + 1);
    else continue;
    if (!value) throw new Error(`${arg} needs a framework id (${FRAMEWORKS.join(", ")})`);
    picked.push(...value.split(",").map((v) => v.trim()).filter(Boolean));
  }
  const unknown = picked.filter((fw) => !FRAMEWORKS.includes(fw));
  if (unknown.length) throw new Error(`unknown framework ${unknown.join(", ")}; expected one of ${FRAMEWORKS.join(", ")}`);
  return picked.length ? FRAMEWORKS.filter((fw) => picked.includes(fw)) : [...FRAMEWORKS];
}

export function readFlag(argv, name) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a value`);
      return value;
    }
    if (argv[i].startsWith(`${name}=`)) return argv[i].slice(name.length + 1);
  }
  return undefined;
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

export function contentType(file) {
  return CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Decoded, dot-segment-free URL path, or null when it cannot be decoded safely. */
export function normalizeUrlPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const trailing = decoded.endsWith("/");
  let normal = posix.normalize(decoded.startsWith("/") ? decoded : `/${decoded}`);
  if (trailing && !normal.endsWith("/")) normal += "/";
  return normal;
}

export function isForbiddenPath(pathname) {
  const normal = normalizeUrlPath(pathname);
  if (normal === null) return true;
  const lower = normal.toLowerCase();
  return lower === FORBIDDEN_PREFIX.slice(0, -1) || lower.startsWith(FORBIDDEN_PREFIX);
}

function inside(root, file) {
  const rel = relative(root, file);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * `/sdk-docs/<rest>` to a file under the composed build. Paths ending in `/` get
 * `index.html`, as the production Cloudflare rewrite does. Anything else maps 1:1,
 * so `/sdk-docs/playground` without the slash is not found, as in production.
 */
export function sitePathToFile(siteRoot, pathname) {
  const normal = normalizeUrlPath(pathname);
  if (normal === null || !normal.startsWith(SITE_BASE)) return null;
  let rest = normal.slice(SITE_BASE.length);
  if (rest === "" || rest.endsWith("/")) rest += "index.html";
  const file = resolve(siteRoot, ...rest.split("/"));
  return inside(resolve(siteRoot), file) ? file : null;
}

const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const NEVER_SERVED = new Set(["content-key.json", "package.json"]);

/** `/api/bundles/<version>/<rest>` to `{ version, rest }`, or null. */
export function parseBundlePath(pathname) {
  const normal = normalizeUrlPath(pathname);
  if (normal === null || !normal.startsWith(BUNDLES_BASE)) return null;
  const tail = normal.slice(BUNDLES_BASE.length);
  const slash = tail.indexOf("/");
  if (slash <= 0) return null;
  const version = tail.slice(0, slash);
  const rest = tail.slice(slash + 1);
  if (!VERSION.test(version) || version.includes("..") || rest === "" || rest.endsWith("/")) return null;
  return { version, rest };
}

/**
 * Bundle request to a file in `--bundles <dir>`. The local `domdoc-wasm/pkg`
 * layout is `<dir>/<format>/<file>` with no version folder; a `<dir>/<version>/`
 * folder (the API's `DOMDOC_BUNDLE_DIR` layout) wins when it exists.
 * A reserved renderer filename is not served. The renderer is inside the pdf wasm.
 */
export function bundlePathToFile(bundlesDir, pathname) {
  const parsed = parseBundlePath(pathname);
  if (!parsed) return null;
  const parts = parsed.rest.split("/");
  const name = parts[parts.length - 1];
  if (name.toLowerCase() === "pdfium.wasm" || NEVER_SERVED.has(name) || name.endsWith(".d.ts")) return null;
  const root = resolve(bundlesDir);
  const versioned = join(root, parsed.version);
  const base = isDir(versioned) ? versioned : root;
  const file = resolve(base, ...parts);
  if (!inside(base, file)) return null;
  if (isFile(file)) return file;
  return null;
}

/** Upstream URL for a bundle request when no `--bundles` dir is given. */
export function bundleProxyUrl(cdn, pathname, search = "") {
  const parsed = parseBundlePath(pathname);
  if (!parsed) return null;
  const name = parsed.rest.split("/").pop() ?? "";
  if (name.toLowerCase() === "pdfium.wasm") return null;
  return `${cdn.replace(/\/+$/, "")}/${parsed.version}/${parsed.rest}${search}`;
}

/** Files under `root` whose text contains `needle`. Binary files are skipped. */
export function filesContaining(root, needle, { extensions = [".html", ".js", ".mjs", ".css", ".json", ".txt", ".xml", ".map"] } = {}) {
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.includes(extname(entry.name).toLowerCase()) && readFileSync(full, "utf8").includes(needle)) hits.push(full);
    }
  };
  if (isDir(root)) walk(root);
  return hits;
}

/**
 * A one-page PDF with "Hello, domdoc" in Helvetica, built in code so no fixture
 * is committed. The xref offsets are exact.
 */
export function helloPdf() {
  const text = "BT /F1 36 Tf 72 700 Td (Hello, domdoc) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}endstream`,
  ];
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let length = chunks[0].length;
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(length);
    const chunk = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, "latin1");
    chunks.push(chunk);
    length += chunk.length;
  });
  const xrefAt = length;
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

export function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
