"use strict";

// Examples call bundlesFromCdn(), which fetches sealed bundles at runtime.
// Bundlers still see new URL("….wasm", import.meta.url) in pkg/ and
// @embedpdf/pdfium and copy those bytes into the static export. Mark those
// URLs so they stay runtime resolutions, and drop any engine wasm that
// still lands in the bundle.

const ENGINE_PACKAGE = /(?:^|[\\/])(?:domdoc-wasm[\\/]pkg|@embedpdf[\\/]pdfium|@domdoc[\\/]core|packages[\\/]core)(?:[\\/]|$)/;

function isEngineWasmSpecifier(url) {
  const normalized = String(url).replace(/\\/g, "/");
  if (/(^|\/)pdfium\.wasm$/i.test(normalized)) return true;
  if (/(^|\/)domdoc_[a-z0-9]+_bg\.wasm$/i.test(normalized)) return true;
  if (normalized.includes("/pkg/") && normalized.toLowerCase().endsWith(".wasm")) return true;
  if (normalized.includes("@embedpdf/pdfium") && normalized.toLowerCase().endsWith(".wasm")) return true;
  return false;
}

function isEngineWasmAsset(name) {
  const base = String(name).split(/[/\\]/).pop() || "";
  return /^(?:pdfium|domdoc_[a-z0-9]+_bg)(?:[.-][A-Za-z0-9_]+)?\.wasm$/i.test(base);
}

function isWasmMagic(source) {
  const bytes = source && typeof source.source === "function" ? source.source() : source;
  if (typeof bytes === "string") {
    return (
      bytes.length >= 4 &&
      bytes.charCodeAt(0) === 0 &&
      bytes.charCodeAt(1) === 0x61 &&
      bytes.charCodeAt(2) === 0x73 &&
      bytes.charCodeAt(3) === 0x6d
    );
  }
  return Boolean(bytes && bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d);
}

function rewriteEngineWasmUrls(code, comment) {
  if (!code.includes(".wasm") || !code.includes("import.meta.url")) return code;
  return code.replace(/\bnew\s+URL\s*\(\s*(['"])([^'"]+\.wasm)\1\s*,\s*import\.meta\.url\s*\)/g, (full, quote, url) => {
    if (!isEngineWasmSpecifier(url)) return full;
    return `new URL(${comment} ${quote}${url}${quote}, import.meta.url)`;
  });
}

function assetNames(fileName, item) {
  const names = [fileName];
  if (item) {
    if (item.fileName) names.push(item.fileName);
    if (item.name) names.push(item.name);
    if (item.originalFileName) names.push(item.originalFileName);
    if (Array.isArray(item.originalFileNames)) names.push(...item.originalFileNames);
  }
  return names.map(String);
}

function shouldDropOutput(fileName, item, source) {
  if (assetNames(fileName, item).some((name) => isEngineWasmAsset(name))) return true;
  return isWasmMagic(source);
}

function excludeEngineWasm() {
  return {
    name: "exclude-engine-wasm",
    enforce: "pre",
    transform(code) {
      if (typeof code !== "string") return null;
      const next = rewriteEngineWasmUrls(code, "/* @vite-ignore */");
      if (next === code) return null;
      return { code: next, map: null };
    },
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        const item = bundle[fileName];
        if (!item || item.type !== "asset") continue;
        if (shouldDropOutput(fileName, item, item.source)) delete bundle[fileName];
      }
    },
  };
}

function excludeEngineWasmLoader(source) {
  if (this && typeof this.cacheable === "function") this.cacheable();
  if (Buffer.isBuffer(source) && isWasmMagic(source)) return source;
  const code = Buffer.isBuffer(source) ? source.toString("utf8") : String(source);
  return rewriteEngineWasmUrls(code, "/* webpackIgnore: true */");
}

function applyWebpack(config) {
  config.module ??= {};
  config.module.rules ??= [];
  config.plugins ??= [];
  config.module.rules.push({
    test: /\.[cm]?js$/,
    enforce: "pre",
    include: ENGINE_PACKAGE,
    // webpackIgnore keeps new URL() from copying pkg/ and PDFium wasm into the export.
    loader: __filename,
  });
  config.module.rules.push({
    test: /\.wasm$/,
    include: ENGINE_PACKAGE,
    type: "asset/resource",
    generator: { emit: false },
  });
  config.plugins.push({ apply: dropEngineWasmAssets });
}

function dropEngineWasmAssets(compiler) {
  compiler.hooks.thisCompilation.tap("exclude-engine-wasm", (compilation) => {
    compilation.hooks.processAssets.tap(
      {
        name: "exclude-engine-wasm",
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
      },
      () => {
        const doomed = [];
        for (const asset of compilation.getAssets()) {
          if (shouldDropOutput(asset.name, null, asset.source)) doomed.push(asset.name);
        }
        for (const name of doomed) compilation.deleteAsset(name);
      },
    );
  });
}

module.exports = excludeEngineWasmLoader;
module.exports.excludeEngineWasm = excludeEngineWasm;
module.exports.applyWebpack = applyWebpack;
module.exports.rewriteEngineWasmUrls = rewriteEngineWasmUrls;
module.exports.isEngineWasmSpecifier = isEngineWasmSpecifier;
module.exports.isWasmMagic = isWasmMagic;
