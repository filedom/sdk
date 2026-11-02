// node --test scripts/site.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { NOT_BUILT, buildExamples } from "./build-examples.mjs";
import { composeSite, scanSite } from "./build-site.mjs";
import { createSiteServer, routeRequest } from "./serve-examples.mjs";
import {
  BUNDLES_BASE,
  BUNDLES_ENV,
  DEFAULT_CDN,
  EXAMPLES_ROOT,
  FORBIDDEN_PREFIX,
  FRAMEWORKS,
  SAMPLE_PDF_PATH,
  SDK_ROOT,
  SITE_BASE,
  bundlePathToFile,
  bundleProxyUrl,
  contentType,
  exampleBase,
  findOutputDir,
  helloPdf,
  isDir,
  isForbiddenPath,
  parseOnly,
  sitePathToFile,
} from "./site-lib.mjs";

const scratch = mkdtempSync(join(tmpdir(), "filedom-site-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

function write(file, body = "") {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

function dir(name) {
  const path = join(scratch, name);
  mkdirSync(path, { recursive: true });
  return path;
}

describe("contract constants", () => {
  test("match packages/ui/src/contracts.ts", () => {
    const source = readFileSync(join(SDK_ROOT, "packages", "ui", "src", "contracts.ts"), "utf8");
    const constant = (name) => source.match(new RegExp(`export const ${name}(?:: \\w+)? = "([^"]*)"`))?.[1];
    assert.equal(constant("SITE_BASE"), SITE_BASE);
    assert.equal(constant("SAMPLE_PDF_PATH"), SAMPLE_PDF_PATH);
    assert.equal(constant("BUNDLES_BASE"), BUNDLES_BASE);
    assert.equal(constant("BUNDLES_ENV"), BUNDLES_ENV);
    assert.equal(constant("DEFAULT_CDN"), DEFAULT_CDN);
    assert.equal(constant("FORBIDDEN_PREFIX"), FORBIDDEN_PREFIX);
    const list = source.match(/export const FRAMEWORKS = \[([^\]]*)\]/)[1];
    assert.deepEqual([...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]), FRAMEWORKS);
  });

  test("every framework has an example directory", () => {
    for (const fw of FRAMEWORKS) assert.ok(isDir(join(EXAMPLES_ROOT, fw)), fw);
  });

  test("example base is /sdk-docs/examples/<fw>/", () => {
    for (const fw of FRAMEWORKS) assert.equal(exampleBase(fw), `/sdk-docs/examples/${fw}/`);
  });
});

describe("site path mapping", () => {
  const root = "/srv/site";

  test("paths ending in / get index.html", () => {
    assert.equal(sitePathToFile(root, "/sdk-docs/"), join(root, "index.html"));
    assert.equal(sitePathToFile(root, "/sdk-docs/playground/"), join(root, "playground", "index.html"));
    assert.equal(sitePathToFile(root, "/sdk-docs/examples/vue/"), join(root, "examples", "vue", "index.html"));
    assert.equal(sitePathToFile(root, "/sdk-docs/files/"), join(root, "files", "index.html"));
  });

  test("other paths map one to one", () => {
    assert.equal(sitePathToFile(root, "/sdk-docs/samples/hello.pdf"), join(root, "samples", "hello.pdf"));
    assert.equal(sitePathToFile(root, "/sdk-docs/examples/next/_next/static/a.js"), join(root, "examples", "next", "_next", "static", "a.js"));
    assert.equal(sitePathToFile(root, "/sdk-docs/playground"), join(root, "playground"));
    assert.equal(sitePathToFile(root, "/sdk-docs/a%20b.html"), join(root, "a b.html"));
  });

  test("paths outside /sdk-docs/ or escaping the root are refused", () => {
    assert.equal(sitePathToFile(root, "/"), null);
    assert.equal(sitePathToFile(root, "/sdk-docs"), null);
    assert.equal(sitePathToFile(root, "/pricing/"), null);
    assert.equal(sitePathToFile(root, "/sdk-docs/%2e%2e/secret"), null);
    assert.equal(sitePathToFile(root, "/sdk-docs/..%2f..%2fetc%2fpasswd"), null);
    assert.equal(sitePathToFile(root, "/sdk-docs/%E0%A4%A"), null);
  });

  test("routeRequest sends / to /sdk-docs/", () => {
    assert.deepEqual(routeRequest("/", { root }), { kind: "redirect", location: SITE_BASE });
  });
});

describe("/wasm/ is never served", () => {
  test("isForbiddenPath", () => {
    for (const path of ["/wasm/", "/wasm", "/wasm/0.1.0/pdf/filedom_pdf_bg.wasm", "/WASM/latest.json", "/%77asm/x", "/sdk-docs/../wasm/x", "/sdk-docs/%2e%2e/wasm/x"]) {
      assert.ok(isForbiddenPath(path), path);
    }
    for (const path of ["/sdk-docs/", "/sdk-docs/wasm/notes/", "/wasmish", "/api/bundles/0.1.0/pdf/filedom_pdf_bg.wasm"]) {
      assert.ok(!isForbiddenPath(path), path);
    }
  });

  test("routeRequest refuses /wasm/ with 404 even with --bundles", () => {
    assert.deepEqual(routeRequest("/wasm/0.1.0/pdf/filedom_pdf.js", { bundles: "/tmp" }), { kind: "forbidden", status: 404 });
  });
});

describe("bundle route", () => {
  const pkg = dir("pkg");
  const glue = write(join(pkg, "pdf", "filedom_pdf.js"), "export default 1;");
  const wasm = write(join(pkg, "pdf", "filedom_pdf_bg.wasm"), "\0asm");
  write(join(pkg, "pdf", "content-key.json"), "{}");
  write(join(pkg, "pdf", "filedom_pdf.d.ts"), "");
  const office = write(join(pkg, "office", "filedom_office.js"), "");
  write(join(pkg, "pdf", "pdfium.wasm"), "\0asm");
  const versioned = dir("bundle-dir");
  const v2 = write(join(versioned, "2.0.0", "pdf", "filedom_pdf.js"), "");

  test("--bundles maps /api/bundles/<version>/<format>/<file> onto the pkg layout", () => {
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/pdf/filedom_pdf.js"), glue);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/latest/pdf/filedom_pdf_bg.wasm"), wasm);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/office/filedom_office.js"), office);
    assert.equal(routeRequest("/api/bundles/0.1.0/pdf/filedom_pdf.js?ticket=t", { bundles: pkg }).file, glue);
  });

  test("a <dir>/<version>/ folder wins when it exists", () => {
    assert.equal(bundlePathToFile(versioned, "/api/bundles/2.0.0/pdf/filedom_pdf.js"), v2);
    assert.equal(bundlePathToFile(versioned, "/api/bundles/3.0.0/pdf/filedom_pdf.js"), null);
  });

  test("a file named pdfium.wasm is not served", () => {
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/pdf/pdfium.wasm"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/office/pdfium.wasm"), null);
    assert.equal(bundleProxyUrl("http://cdn.test/b/", "/api/bundles/latest/pdf/pdfium.wasm", "?ticket=x"), null);
  });

  test("content keys, type stubs, bad versions, and escapes are refused", () => {
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/pdf/content-key.json"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/pdf/filedom_pdf.d.ts"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/pdf/missing.js"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/%2e%2e/pdf/filedom_pdf.js"), null);
    assert.equal(bundlePathToFile(pkg, "/api/bundles/0.1.0/..%2f..%2fsecret"), null);
    assert.deepEqual(routeRequest("/api/bundles/0.1.0/pdf/content-key.json", { bundles: pkg }), { kind: "missing" });
  });

  test("without --bundles the route proxies FILEDOM_CDN", () => {
    assert.equal(bundleProxyUrl(DEFAULT_CDN, "/api/bundles/0.1.0/pdf/filedom_pdf.js"), "https://filedom.io/api/bundles/0.1.0/pdf/filedom_pdf.js");
    assert.equal(bundleProxyUrl("http://cdn.test/b/", "/api/bundles/latest/pdf/filedom_pdf_bg.wasm", "?ticket=x"), "http://cdn.test/b/latest/pdf/filedom_pdf_bg.wasm?ticket=x");
    assert.deepEqual(routeRequest("/api/bundles/1.2.3/office/filedom_office.js?ticket=t", { cdn: "http://cdn.test" }), {
      kind: "proxy",
      url: "http://cdn.test/1.2.3/office/filedom_office.js?ticket=t",
    });
  });
});

describe("content types", () => {
  test("wasm, javascript, pdf, html, css, json", () => {
    assert.equal(contentType("a/filedom_pdf_bg.wasm"), "application/wasm");
    assert.equal(contentType("a/filedom_pdf.js"), "text/javascript; charset=utf-8");
    assert.equal(contentType("a/x.mjs"), "text/javascript; charset=utf-8");
    assert.equal(contentType("samples/hello.pdf"), "application/pdf");
    assert.equal(contentType("index.html"), "text/html; charset=utf-8");
    assert.equal(contentType("a.CSS"), "text/css; charset=utf-8");
    assert.equal(contentType("latest.json"), "application/json");
    assert.equal(contentType("logo.svg"), "image/svg+xml");
    assert.equal(contentType("blob"), "application/octet-stream");
  });
});

describe("generated sample PDF", () => {
  const pdf = helloPdf();
  const text = pdf.toString("latin1");

  test("starts with %PDF- and ends with %%EOF", () => {
    assert.ok(text.startsWith("%PDF-"));
    assert.ok(text.endsWith("%%EOF"));
  });

  test("xref offsets point at each object and startxref at the table", () => {
    const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF$/)[1]);
    assert.ok(text.startsWith("xref\n", startxref));
    const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    assert.equal(entries.length, 5);
    entries.forEach((offset, i) => assert.ok(text.startsWith(`${i + 1} 0 obj\n`, offset), `object ${i + 1}`));
    const length = Number(text.match(/\/Length (\d+) >>\nstream\n/)[1]);
    const body = text.slice(text.indexOf("stream\n") + 7, text.indexOf("endstream"));
    assert.equal(Buffer.byteLength(body, "latin1"), length);
  });
});

describe("serve-examples over HTTP", () => {
  const root = dir("site");
  write(join(root, "index.html"), "<!doctype html>docs");
  write(join(root, "playground", "index.html"), "<!doctype html>playground");
  write(join(root, "examples", "vue", "index.html"), "<!doctype html>vue");
  write(join(root, "examples", "vue", "assets", "index-abc.js"), "console.log(1)");
  write(join(root, "samples", "hello.pdf"), helloPdf());
  const bundles = dir("serve-pkg");
  write(join(bundles, "pdf", "filedom_pdf.js"), "export default 1;");
  write(join(bundles, "pdf", "filedom_pdf_bg.wasm"), "\0asm");
  write(join(bundles, "pdf", "pdfium.wasm"), "\0asm");
  const proxied = [];
  const fakeFetch = async (url, init) => {
    proxied.push({ url, ticket: init.headers["x-filedom-ticket"] });
    return new Response("glue", { status: 200, headers: { "content-type": "text/javascript; charset=utf-8" } });
  };
  let local;
  let proxy;
  const origin = (server) => `http://127.0.0.1:${server.address().port}`;

  before(async () => {
    local = createSiteServer({ root, bundles });
    proxy = createSiteServer({ root, cdn: "http://cdn.test/api/bundles", fetchImpl: fakeFetch });
    await Promise.all([local, proxy].map((s) => new Promise((done) => s.listen(0, "127.0.0.1", done))));
  });
  after(() => Promise.all([local, proxy].map((s) => new Promise((done) => s.close(done)))));

  const get = (server, path, init) => fetch(`${origin(server)}${path}`, { redirect: "manual", ...init });

  test("site pages, index.html rule, and missing slash", async () => {
    const docs = await get(local, "/sdk-docs/");
    assert.equal(docs.status, 200);
    assert.equal(docs.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(await docs.text(), /docs/);
    assert.match(await (await get(local, "/sdk-docs/playground/")).text(), /playground/);
    assert.match(await (await get(local, "/sdk-docs/examples/vue/")).text(), /vue/);
    assert.equal((await get(local, "/sdk-docs/playground")).status, 404);
    assert.equal((await get(local, "/sdk-docs/nope/")).status, 404);
    const redirect = await get(local, "/");
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get("location"), "/sdk-docs/");
  });

  test("content types over the wire", async () => {
    const js = await get(local, "/sdk-docs/examples/vue/assets/index-abc.js");
    assert.equal(js.headers.get("content-type"), "text/javascript; charset=utf-8");
    const pdf = await get(local, "/sdk-docs/samples/hello.pdf");
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    assert.ok(Buffer.from(await pdf.arrayBuffer()).equals(helloPdf()));
    const wasm = await get(local, "/api/bundles/0.1.0/pdf/filedom_pdf_bg.wasm");
    assert.equal(wasm.status, 200);
    assert.equal(wasm.headers.get("content-type"), "application/wasm");
    const glue = await get(local, "/api/bundles/0.1.0/pdf/filedom_pdf.js");
    assert.equal(glue.headers.get("content-type"), "text/javascript; charset=utf-8");
    const pdfium = await get(local, "/api/bundles/0.1.0/pdf/pdfium.wasm");
    assert.equal(pdfium.status, 404);
    assert.notEqual(pdfium.headers.get("content-type"), "application/wasm");
  });

  test("/wasm/* is 404 on both servers", async () => {
    for (const server of [local, proxy]) {
      for (const path of ["/wasm/0.1.0/pdf/filedom_pdf_bg.wasm", "/wasm/latest.json", "/%77asm/x"]) {
        const res = await get(server, path);
        assert.equal(res.status, 404, path);
        assert.notEqual(res.headers.get("content-type"), "application/wasm");
      }
    }
    assert.ok(!proxied.some((p) => p.url.includes("/wasm/")));
  });

  test("HEAD has no body and other methods are refused", async () => {
    const head = await get(local, "/sdk-docs/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal((await get(local, "/sdk-docs/", { method: "POST" })).status, 405);
  });

  test("the proxy forwards path, query, and ticket header to FILEDOM_CDN", async () => {
    const res = await get(proxy, "/api/bundles/0.2.0/pdf/filedom_pdf.js?ticket=q", { headers: { "x-filedom-ticket": "h" } });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "glue");
    assert.deepEqual(proxied.at(-1), { url: "http://cdn.test/api/bundles/0.2.0/pdf/filedom_pdf.js?ticket=q", ticket: "h" });
  });
});

describe("build-examples", () => {
  const examples = dir("examples");
  const shell = (fw, build) => write(join(examples, fw, "package.json"), JSON.stringify({ name: `@filedom/example-${fw}`, scripts: build ? { build } : {} }));
  shell("react", "vite build");
  shell("vue", "node -e \"console.log('@filedom/example-vue: no app yet')\"");
  shell("svelte");
  shell("angular", "ng build");
  shell("lit", "vite build");

  test("--only and --fw pick frameworks; unknown ids are named", () => {
    assert.deepEqual(parseOnly([]), FRAMEWORKS);
    assert.deepEqual(parseOnly(["--only", "vue"]), ["vue"]);
    assert.deepEqual(parseOnly(["--fw=vue,react", "--only", "lit"]), ["react", "vue", "lit"]);
    assert.throws(() => parseOnly(["--only", "ember"]), /unknown framework ember/);
    assert.throws(() => parseOnly(["--only"]), /--only needs a framework id/);
  });

  test("each build gets FILEDOM_BASE and output is staged; placeholders report not built yet", () => {
    const staging = dir("staging-ok");
    const calls = [];
    const run = (cwd, env) => {
      calls.push({ cwd, base: env.FILEDOM_BASE, bundles: env.FILEDOM_EXAMPLES_BUNDLES });
      if (cwd.endsWith("react")) write(join(cwd, "dist", "index.html"), "react");
      if (cwd.endsWith("angular")) write(join(cwd, "dist", "app", "browser", "index.html"), "angular");
      return { code: 0 };
    };
    const results = buildExamples({
      frameworks: ["react", "vue", "svelte", "angular"],
      examplesRoot: examples,
      staging,
      env: { FILEDOM_EXAMPLES_BUNDLES: "/api/bundles/9.9.9" },
      run,
      log: () => {},
    });
    assert.deepEqual(results.map((r) => [r.fw, r.status]), [["react", "built"], ["vue", NOT_BUILT], ["svelte", NOT_BUILT], ["angular", "built"]]);
    assert.deepEqual(calls.map((c) => c.base), ["/sdk-docs/examples/react/", "/sdk-docs/examples/angular/"]);
    assert.ok(calls.every((c) => c.bundles === "/api/bundles/9.9.9"));
    assert.equal(readFileSync(join(staging, "react", "index.html"), "utf8"), "react");
    assert.equal(readFileSync(join(staging, "angular", "index.html"), "utf8"), "angular");
  });

  test("a failing build, a build with no output, and a missing example name the framework", () => {
    const results = buildExamples({
      frameworks: ["react", "lit", "solid"],
      examplesRoot: examples,
      staging: dir("staging-fail"),
      run: (cwd) => ({ code: cwd.endsWith("react") ? 2 : 0 }),
      log: () => {},
    });
    assert.deepEqual(results.map((r) => r.status), ["failed", "failed", "failed"]);
    assert.match(results[0].detail, /^react: build failed \(exit 2\)/);
    assert.match(results[1].detail, /^lit: build finished but wrote no index\.html/);
    assert.match(results[2].detail, /^solid: no package\.json/);
  });

  test("findOutputDir knows each framework's output folder", () => {
    const root = dir("outputs");
    write(join(root, "next", "out", "index.html"));
    write(join(root, "nuxt", ".output", "public", "index.html"));
    write(join(root, "sveltekit", "build", "index.html"));
    write(join(root, "angular", "dist", "demo", "browser", "index.html"));
    assert.equal(findOutputDir(join(root, "next"), "next"), join(root, "next", "out"));
    assert.equal(findOutputDir(join(root, "nuxt"), "nuxt"), join(root, "nuxt", ".output", "public"));
    assert.equal(findOutputDir(join(root, "sveltekit"), "sveltekit"), join(root, "sveltekit", "build"));
    assert.equal(findOutputDir(join(root, "angular"), "angular"), join(root, "angular", "dist", "demo", "browser"));
    assert.equal(findOutputDir(join(root, "vue"), "vue"), null);
  });
});

describe("build-site composition", () => {
  test("examples land in examples/<fw>/ and the sample in samples/hello.pdf", () => {
    const build = dir("compose-build");
    write(join(build, "index.html"), "<!doctype html>docs");
    write(join(build, "examples", "vue", "stale.html"), "old");
    const staging = dir("compose-staging");
    write(join(staging, "react", "index.html"), "react");
    write(join(staging, "react", "assets", "a.js"), "fetch('/api/bundles/0.1.0/pdf/filedom_pdf.js')");

    const { copied, missing, sample, violations } = composeSite({ buildDir: build, staging, frameworks: FRAMEWORKS });
    assert.deepEqual(copied, ["react"]);
    assert.deepEqual(missing, FRAMEWORKS.filter((fw) => fw !== "react"));
    assert.equal(sample, join(build, "samples", "hello.pdf"));
    assert.ok(readFileSync(sample).equals(helloPdf()));
    assert.equal(readFileSync(join(build, "examples", "react", "index.html"), "utf8"), "react");
    assert.ok(!isDir(join(build, "examples", "vue")));
    assert.deepEqual(violations, []);
    assert.equal(sitePathToFile(build, "/sdk-docs/examples/react/"), join(build, "examples", "react", "index.html"));
    assert.equal(sitePathToFile(build, SAMPLE_PDF_PATH), sample);
  });

  test("filedom.dev anywhere and /wasm/ in an example fail the scan", () => {
    const build = dir("scan-build");
    write(join(build, "index.html"), '<link rel="canonical" href="https://filedom.dev/">');
    write(join(build, "examples", "lit", "assets", "a.js"), "fetch('/wasm/0.1.0/pdf/filedom_pdf.js')");
    write(join(build, "docs", "bundles", "index.html"), "Nothing loads from /wasm/ in production.");
    const violations = scanSite(build);
    assert.deepEqual(violations.map((v) => v.needle), ["filedom.dev", "/wasm/"]);
    assert.deepEqual(violations[0].files, [join(build, "index.html")]);
    assert.deepEqual(violations[1].files, [join(build, "examples", "lit", "assets", "a.js")]);
  });

  test("a missing docs build is a clear error", () => {
    assert.throws(() => composeSite({ buildDir: join(scratch, "no-build"), staging: scratch }), /docs build not found/);
  });
});
