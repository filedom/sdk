import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

const { applyWebpack } = createRequire(path.join(process.cwd(), "package.json"))(
  path.join(process.cwd(), "..", "exclude-engine-wasm.cjs"),
) as {
  applyWebpack: (config: unknown) => void;
};

function publicBase(): string {
  const raw = process.env.FILEDOM_BASE || "/sdk-docs/examples/next/";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

const base = publicBase();

const nextConfig: NextConfig = {
  output: "export",
  basePath: base,
  assetPrefix: base,
  trailingSlash: true,
  env: {
    FILEDOM_EXAMPLES_BUNDLES: process.env.FILEDOM_EXAMPLES_BUNDLES || "/api/bundles/0.0.1",
  },
  webpack: (config) => {
    applyWebpack(config);
    // wasm is "type": "commonjs", but the glue files are ESM.
    config.module.rules.push({
      test: /[\\/]wasm[\\/]pkg[\\/].+\.js$/,
      type: "javascript/esm",
    });
    // Core imports node:fs/promises only when process.versions.node is set.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      "fs/promises": false,
    };
    config.plugins.push({
      apply(compiler: { webpack: { NormalModuleReplacementPlugin: new (pattern: RegExp, fn: (resource: { request: string }) => void) => { apply: (compiler: unknown) => void } } }) {
        new compiler.webpack.NormalModuleReplacementPlugin(/^node:fs\/promises$/, (resource) => {
          resource.request = "fs/promises";
        }).apply(compiler);
      },
    });
    return config;
  },
};

export default nextConfig;
