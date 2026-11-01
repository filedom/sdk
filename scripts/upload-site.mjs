#!/usr/bin/env node
// Upload apps/docs/build to the R2 bucket prefix sdk-docs/.
// Add or overwrite only. This script never deletes objects.
//
//   node scripts/upload-site.mjs [--dry-run] [--root <dir>]
//
// Credentials: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.
// Optional: R2_ENDPOINT, R2_BUCKET (defaults in this file).
// --dry-run prints every key, content type, and cache header and sends nothing.
import { createHash, createHmac } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DOCS_BUILD, contentType, isDir } from "./site-lib.mjs";

export const DEFAULT_ENDPOINT = "https://3d28ddc0579eb80dd173c75d55be3768.r2.cloudflarestorage.com";
export const DEFAULT_BUCKET = "domdoc";
export const DOCS_PREFIX = "sdk-docs";
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
export const SHORT_CACHE = "public, max-age=60, must-revalidate";

const REGION = "auto";
const PREFIX = DOCS_PREFIX;
const FORBIDDEN_ROOTS = [];
const ROOT_LABEL = "docs build";

export function cacheControlFor(key) {
  if (versionedWasm(key) || hashedAsset(key)) return IMMUTABLE_CACHE;
  return SHORT_CACHE;
}

function versionedWasm(key) {
  if (!key.startsWith("wasm/")) return false;
  return key.slice("wasm/".length).includes("/");
}

function hashedAsset(key) {
  return key.startsWith("_next/static/") || key.includes("/_next/static/") || key.startsWith("sdk-docs/assets/");
}

export function authorizationHeader({
  method,
  canonicalUri,
  headers,
  payloadHash,
  accessKeyId,
  secretAccessKey,
  amzDate,
  region,
}) {
  const names = Object.keys(headers).map((name) => name.toLowerCase()).sort();
  const canonicalHeaders = names.map((name) => `${name}:${canonicalHeaderValue(headers[name])}\n`).join("");
  const signedHeaders = names.join(";");
  const canonical = [method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const signature = createHmac("sha256", signingKey(secretAccessKey, dateStamp, region)).update(stringToSign).digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function canonicalHeaderValue(value) {
  return String(value).trim().replace(/ +/g, " ");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function signingKey(secret, dateStamp, region) {
  let key = hmac(`AWS4${secret}`, dateStamp);
  key = hmac(key, region);
  key = hmac(key, "s3");
  return hmac(key, "aws4_request");
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

function uriEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function createR2Client({
  accessKeyId,
  secretAccessKey,
  endpoint = DEFAULT_ENDPOINT,
  bucket = DEFAULT_BUCKET,
  region = REGION,
  fetchImpl = globalThis.fetch,
}) {
  const base = resolveEndpoint(endpoint);
  return {
    async send(command) {
      if (command?.name !== "PutObject") {
        throw new Error(`upload-site only puts objects (refusing ${command?.name ?? "unknown"})`);
      }
      const { Key, Body, ContentType, CacheControl } = command.input;
      const bytes = Buffer.isBuffer(Body) ? Body : Buffer.from(Body);
      const payloadHash = sha256(bytes);
      const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
      const canonicalUri = `/${uriEncode(bucket)}/${Key.split("/").map(uriEncode).join("/")}`;
      const headers = {
        "cache-control": CacheControl,
        "content-type": ContentType,
        host: base.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
      };
      const authorization = authorizationHeader({
        method: "PUT",
        canonicalUri,
        headers,
        payloadHash,
        accessKeyId,
        secretAccessKey,
        amzDate,
        region,
      });
      const response = await fetchImpl(`${base.origin}${canonicalUri}`, {
        method: "PUT",
        redirect: "manual",
        headers: {
          authorization,
          "cache-control": CacheControl,
          "content-type": ContentType,
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": amzDate,
        },
        body: new Uint8Array(bytes),
      });
      if (response.status !== 200 && response.status !== 204) {
        const text = await response.text();
        throw new Error(`PutObject ${Key} failed (${response.status}): ${text.slice(0, 500)}`);
      }
      return { ok: true };
    },
  };
}

function resolveEndpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("R2_ENDPOINT must be an https URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("R2_ENDPOINT must be an https origin");
  }
  return url;
}

function requireCredentials(env) {
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required without --dry-run");
  }
  return { accessKeyId, secretAccessKey };
}

function skipFile(name) {
  const lower = name.toLowerCase();
  if (lower === "content-key.json" || lower === "package.json") return true;
  if (lower.endsWith(".d.ts")) return true;
  return lower === "readme" || lower.startsWith("readme.");
}

function rejectUnsafeName(name) {
  if (name.includes("/") || name.includes("\\") || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error(`refusing unsafe file name ${name}`);
  }
}

function assertSafeKey(key) {
  if (typeof key !== "string" || key.length === 0 || key.startsWith("/") || key.endsWith("/") || key.includes("\\") || key.includes("//") || key.includes("\0")) {
    throw new Error(`refusing unsafe object key ${key}`);
  }
  for (const part of key.split("/")) {
    if (part === "" || part === "." || part === "..") throw new Error(`refusing unsafe object key ${key}`);
  }
}

function objectKey(relPath, prefix) {
  assertSafeKey(relPath);
  const key = prefix ? `${prefix}/${relPath}` : relPath;
  assertSafeKey(key);
  if (key.split("/")[0] === "wasm" && key !== key.toLowerCase()) {
    throw new Error(`wasm keys are lowercase (${key})`);
  }
  return key;
}

function walk(root) {
  const files = [];
  const paths = [];
  const visit = (dir, rel) => {
    for (const name of readdirSync(dir).sort()) {
      rejectUnsafeName(name);
      const relPath = rel ? `${rel}/${name}` : name;
      paths.push(relPath);
      const full = join(dir, name);
      const info = statSync(full);
      if (info.isDirectory()) visit(full, relPath);
      else if (info.isFile() && !skipFile(name)) files.push({ file: full, relPath });
    }
  };
  visit(root, "");
  return { files, paths };
}

function forbiddenHits(paths, roots) {
  const banned = new Set(roots.map((root) => root.toLowerCase()));
  if (!banned.size) return [];
  return paths.filter((rel) => banned.has(rel.split("/")[0].toLowerCase())).sort();
}

/**
 * Plan or upload `root`. `client.send` receives `{ name: "PutObject", input }` only.
 * A provided client is used as-is (tests). Otherwise the R2 client signs PutObject.
 */
export async function uploadSite({
  root = DOCS_BUILD,
  dryRun = false,
  env = process.env,
  client = null,
  stdout = process.stdout,
  fetchImpl,
} = {}) {
  if (!isDir(root)) throw new Error(`${ROOT_LABEL} ${root} does not exist`);
  const { files, paths } = walk(root);
  const hits = forbiddenHits(paths, FORBIDDEN_ROOTS);
  if (hits.length) {
    const labels = FORBIDDEN_ROOTS.map((name) => `${name}/`).join(", ");
    throw new Error(`refusing ${hits.length} path(s) under ${labels}: ${hits.join(", ")}`);
  }
  const objects = files.map(({ file, relPath }) => {
    const key = objectKey(relPath, PREFIX);
    return { file, key, contentType: contentType(file), cacheControl: cacheControlFor(key) };
  }).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  if (PREFIX) {
    const outside = objects.filter((object) => !object.key.startsWith(`${PREFIX}/`));
    if (outside.length) {
      throw new Error(`refusing ${outside.length} key(s) outside ${PREFIX}/: ${outside.map((object) => object.key).join(", ")}`);
    }
  }
  const bucket = env.R2_BUCKET || DEFAULT_BUCKET;
  if (!bucket || bucket.includes("/") || bucket.includes("\\")) throw new Error("R2_BUCKET is invalid");
  if (!dryRun && !client) requireCredentials(env);
  for (const object of objects) stdout.write(`${object.key}\t${object.contentType}\t${object.cacheControl}\n`);
  if (dryRun) return { objects: objects.map(publicObject), sent: 0 };
  const s3 = client ?? createR2Client({
    ...requireCredentials(env),
    endpoint: env.R2_ENDPOINT || DEFAULT_ENDPOINT,
    bucket,
    fetchImpl,
  });
  for (const object of objects) {
    await s3.send({
      name: "PutObject",
      input: {
        Bucket: bucket,
        Key: object.key,
        Body: readFileSync(object.file),
        ContentType: object.contentType,
        CacheControl: object.cacheControl,
      },
    });
  }
  return { objects: objects.map(publicObject), sent: objects.length };
}

function publicObject(object) {
  return { key: object.key, contentType: object.contentType, cacheControl: object.cacheControl };
}

export function parseArgs(argv) {
  let dryRun = false;
  let root;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--root" || arg === "--dir") {
      root = argv[++i];
      if (!root || root.startsWith("--")) throw new Error(`${arg} needs a directory`);
    } else if (arg.startsWith("--root=") || arg.startsWith("--dir=")) {
      root = arg.slice(arg.indexOf("=") + 1);
      if (!root) throw new Error(`${arg.split("=")[0]} needs a directory`);
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return { dryRun, root };
}

async function main(argv) {
  const { dryRun, root } = parseArgs(argv);
  const result = await uploadSite({ root: root ? resolve(root) : DOCS_BUILD, dryRun });
  if (dryRun) console.error(`upload-site: dry-run ${result.objects.length} object(s), nothing sent`);
  else console.error(`upload-site: put ${result.sent} object(s)`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`upload-site: ${error.message}`);
    process.exit(1);
  });
}
