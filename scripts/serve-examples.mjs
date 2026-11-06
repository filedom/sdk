#!/usr/bin/env node
// Serve the composed site the way production routes it.
//
//   node scripts/serve-examples.mjs [--port 5180] [--host 127.0.0.1] [--root apps/docs/build] [--bundles <dir>] [--cdn <url>]
//
//   /sdk/docs/*                 the build-site tree; a path ending in / gets index.html
//   /api/bundles/<version>/*    files from --bundles <dir>, else proxied to --cdn / FILEDOM_CDN
//                               (default https://filedom.io/api/bundles)
//   /wasm/*                     always 404, as in CONTRACTS.md section 8
//   /                           redirects to /sdk/docs/
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  BUNDLES_BASE,
  DEFAULT_CDN,
  DOCS_BUILD,
  FORBIDDEN_STATUS,
  SITE_BASE,
  bundlePathToFile,
  bundleProxyUrl,
  contentType,
  isDir,
  isForbiddenPath,
  readFlag,
  sitePathToFile,
} from "./site-lib.mjs";

export const DEFAULT_PORT = 5180;
const FORWARDED_HEADERS = ["x-filedom-ticket", "x-filedom-device", "accept", "if-none-match", "if-modified-since"];

/**
 * Where a request goes, without touching the network. `file` targets may not exist yet;
 * the server answers 404 when they do not.
 */
export function routeRequest(rawUrl, { root = DOCS_BUILD, bundles, cdn = DEFAULT_CDN } = {}) {
  const url = new URL(rawUrl, "http://localhost");
  const { pathname, search } = url;
  if (isForbiddenPath(pathname)) return { kind: "forbidden", status: FORBIDDEN_STATUS };
  if (pathname === "/") return { kind: "redirect", location: SITE_BASE };
  if (pathname.startsWith(BUNDLES_BASE)) {
    if (bundles) {
      const file = bundlePathToFile(bundles, pathname);
      return file ? { kind: "file", file } : { kind: "missing" };
    }
    const target = bundleProxyUrl(cdn, pathname, search);
    return target ? { kind: "proxy", url: target } : { kind: "missing" };
  }
  if (pathname.startsWith(SITE_BASE)) {
    const file = sitePathToFile(root, pathname);
    return file ? { kind: "file", file } : { kind: "missing" };
  }
  return { kind: "missing" };
}

function sendText(res, status, text, head) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  res.end(head ? undefined : text);
}

async function sendFile(req, res, file, head) {
  let info;
  try {
    info = await stat(file);
  } catch {
    return sendText(res, 404, "Not found\n", head);
  }
  if (!info.isFile()) return sendText(res, 404, "Not found\n", head);
  res.writeHead(200, {
    "content-type": contentType(file),
    "content-length": info.size,
    "cache-control": "no-cache",
    "last-modified": info.mtime.toUTCString(),
  });
  if (head) return res.end();
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

async function sendProxy(req, res, target, head, fetchImpl) {
  const headers = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers[name] = value;
  }
  let upstream;
  try {
    upstream = await fetchImpl(target, { method: head ? "HEAD" : "GET", headers, redirect: "follow" });
  } catch (error) {
    return sendText(res, 502, `Bundle proxy failed: ${error.message}\n`, head);
  }
  const out = { "content-type": upstream.headers.get("content-type") ?? contentType(new URL(target).pathname) };
  for (const name of ["content-length", "cache-control", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) out[name] = value;
  }
  if (upstream.headers.get("content-encoding")) delete out["content-length"];
  res.writeHead(upstream.status, out);
  if (head || !upstream.body) return res.end();
  Readable.fromWeb(upstream.body).on("error", () => res.destroy()).pipe(res);
}

/** An http.Server for the composed site. Call `listen` yourself. */
export function createSiteServer({ root = DOCS_BUILD, bundles, cdn = DEFAULT_CDN, fetchImpl = fetch } = {}) {
  return createServer((req, res) => {
    const head = req.method === "HEAD";
    if (req.method !== "GET" && !head) {
      res.setHeader("allow", "GET, HEAD");
      return sendText(res, 405, "Method not allowed\n", false);
    }
    const route = routeRequest(req.url ?? "/", { root, bundles, cdn });
    switch (route.kind) {
      case "forbidden":
        return sendText(res, route.status, "Not found\n", head);
      case "redirect":
        res.writeHead(302, { location: route.location });
        return res.end();
      case "file":
        return void sendFile(req, res, route.file, head);
      case "proxy":
        return void sendProxy(req, res, route.url, head, fetchImpl);
      default:
        return sendText(res, 404, "Not found\n", head);
    }
  });
}

function main(argv) {
  const portFlag = readFlag(argv, "--port");
  const port = portFlag === undefined ? DEFAULT_PORT : Number(portFlag);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`--port must be 0-65535, got ${portFlag}`);
  const host = readFlag(argv, "--host") ?? "127.0.0.1";
  const rootFlag = readFlag(argv, "--root");
  const root = rootFlag ? resolve(rootFlag) : DOCS_BUILD;
  const bundlesFlag = readFlag(argv, "--bundles");
  const bundles = bundlesFlag ? resolve(bundlesFlag) : undefined;
  const cdn = readFlag(argv, "--cdn") ?? process.env.FILEDOM_CDN ?? DEFAULT_CDN;
  if (!isDir(root)) throw new Error(`site root ${root} does not exist; run node scripts/build-site.mjs first`);
  if (bundles && !isDir(bundles)) throw new Error(`--bundles ${bundles} is not a directory`);

  const server = createSiteServer({ root, bundles, cdn });
  server.listen(port, host, () => {
    const { port: bound } = server.address();
    console.log(`serve-examples: http://${host}:${bound}${SITE_BASE}`);
    console.log(`serve-examples: ${BUNDLES_BASE}<version>/ from ${bundles ?? `proxy ${cdn}`}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`serve-examples: ${error.message}`);
    process.exitCode = 1;
  }
}
