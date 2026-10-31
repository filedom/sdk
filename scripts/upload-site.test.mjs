// node --test scripts/upload-site.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { authorizationHeader, createR2Client, uploadSite } from "./upload-site.mjs";

const script = fileURLToPath(new URL("./upload-site.mjs", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "domdoc-upload-docs-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const SHORT = "public, max-age=60, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function write(file, body) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

function tree(name) {
  const root = join(scratch, name);
  mkdirSync(root, { recursive: true });
  return root;
}

function recordingClient(initial = []) {
  const objects = new Map(initial);
  const commands = [];
  return {
    objects,
    commands,
    async send(command) {
      commands.push(command);
      if (command.name === "PutObject") objects.set(command.input.Key, Buffer.from(command.input.Body));
    },
  };
}

function cleanEnv() {
  return { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "" };
}

describe("docs upload", () => {
  test("writes only sdk-docs/ keys and never deletes, including stale keys", async () => {
    const root = tree("site");
    write(join(root, "index.html"), "<!doctype html><title>docs</title>");
    write(join(root, "assets", "main.js"), "console.log(1)");
    write(join(root, "assets", "main.css"), "body{}");
    write(join(root, "examples", "next", "_next", "static", "chunk.js"), "next");
    write(join(root, "samples", "hello.pdf"), "%PDF-1.4");
    write(join(root, "notes.txt"), "hello");
    write(join(root, "data.json"), "{}");
    write(join(root, "img", "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
    write(join(root, "styles.css"), "h1{}");
    write(join(root, "wasm", "notes.txt"), "still under sdk-docs");
    write(join(root, "README.md"), "skip");
    write(join(root, "package.json"), "{}");
    write(join(root, "content-key.json"), "{}");
    write(join(root, "engine.d.ts"), "export {}");
    const client = recordingClient([["sdk-docs/retired.html", Buffer.from("old")]]);
    let fetched = false;
    const stdout = { text: "", write(chunk) { this.text += chunk; } };
    const result = await uploadSite({
      root,
      env: {},
      client,
      stdout,
      fetchImpl() {
        fetched = true;
        throw new Error("network");
      },
    });

    assert.equal(fetched, false);
    assert.equal(result.sent, 10);
    assert.deepEqual(client.commands.map((command) => command.name), Array(10).fill("PutObject"));
    assert.deepEqual(
      client.commands.map((command) => command.input.Key),
      [
        "sdk-docs/assets/main.css",
        "sdk-docs/assets/main.js",
        "sdk-docs/data.json",
        "sdk-docs/examples/next/_next/static/chunk.js",
        "sdk-docs/img/logo.svg",
        "sdk-docs/index.html",
        "sdk-docs/notes.txt",
        "sdk-docs/samples/hello.pdf",
        "sdk-docs/styles.css",
        "sdk-docs/wasm/notes.txt",
      ],
    );
    for (const command of client.commands) {
      assert.equal(command.name, "PutObject");
      assert.equal(command.input.Key.startsWith("sdk-docs/"), true);
      assert.equal(command.input.Bucket, "domdoc");
    }
    assert.equal(client.objects.get("sdk-docs/retired.html").toString(), "old");
    assert.equal(client.commands.some((command) => command.input.Key === "sdk-docs/retired.html"), false);

    const byKey = Object.fromEntries(client.commands.map((command) => [command.input.Key, command.input]));
    assert.equal(byKey["sdk-docs/index.html"].ContentType, "text/html; charset=utf-8");
    assert.equal(byKey["sdk-docs/index.html"].CacheControl, SHORT);
    assert.equal(byKey["sdk-docs/index.html"].Body.toString(), "<!doctype html><title>docs</title>");
    assert.equal(byKey["sdk-docs/assets/main.js"].ContentType, "text/javascript; charset=utf-8");
    assert.equal(byKey["sdk-docs/assets/main.js"].CacheControl, IMMUTABLE);
    assert.equal(byKey["sdk-docs/assets/main.css"].ContentType, "text/css; charset=utf-8");
    assert.equal(byKey["sdk-docs/assets/main.css"].CacheControl, IMMUTABLE);
    assert.equal(byKey["sdk-docs/examples/next/_next/static/chunk.js"].CacheControl, IMMUTABLE);
    assert.equal(byKey["sdk-docs/samples/hello.pdf"].ContentType, "application/pdf");
    assert.equal(byKey["sdk-docs/samples/hello.pdf"].CacheControl, SHORT);
    assert.equal(byKey["sdk-docs/notes.txt"].ContentType, "text/plain; charset=utf-8");
    assert.equal(byKey["sdk-docs/data.json"].ContentType, "application/json");
    assert.equal(byKey["sdk-docs/img/logo.svg"].ContentType, "image/svg+xml");
    assert.equal(byKey["sdk-docs/styles.css"].CacheControl, SHORT);
    assert.equal(byKey["sdk-docs/wasm/notes.txt"].Key.startsWith("sdk-docs/"), true);
    assert.match(stdout.text, /sdk-docs\/index\.html\ttext\/html; charset=utf-8\tpublic, max-age=60, must-revalidate/);
    assert.match(stdout.text, /sdk-docs\/assets\/main\.js\ttext\/javascript; charset=utf-8\tpublic, max-age=31536000, immutable/);
  });

  test("dry-run prints the plan and sends nothing without credentials", async () => {
    const root = tree("dry");
    write(join(root, "index.html"), "<html></html>");
    const commands = [];
    let fetched = false;
    const stdout = { text: "", write(chunk) { this.text += chunk; } };
    const result = await uploadSite({
      root,
      dryRun: true,
      env: {},
      client: { async send(command) { commands.push(command); } },
      stdout,
      fetchImpl() {
        fetched = true;
        throw new Error("network");
      },
    });
    assert.equal(result.sent, 0);
    assert.deepEqual(commands, []);
    assert.equal(fetched, false);
    assert.match(stdout.text, /^sdk-docs\/index\.html\ttext\/html; charset=utf-8\tpublic, max-age=60, must-revalidate\n$/);
  });

  test("missing credentials fail before any request or plan", async () => {
    const root = tree("creds");
    write(join(root, "index.html"), "<html></html>");
    let fetched = false;
    const stdout = { text: "", write(chunk) { this.text += chunk; } };
    await assert.rejects(
      () => uploadSite({
        root,
        env: {},
        stdout,
        fetchImpl() {
          fetched = true;
          throw new Error("network");
        },
      }),
      /R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required without --dry-run/,
    );
    await assert.rejects(
      () => uploadSite({ root, env: { R2_ACCESS_KEY_ID: "only-id" }, stdout, fetchImpl() { fetched = true; } }),
      /R2_SECRET_ACCESS_KEY/,
    );
    assert.equal(fetched, false);
    assert.equal(stdout.text, "");
  });

  test("the R2 client puts one object and refuses deletes", async () => {
    const root = tree("put");
    write(join(root, "a b.html"), "<html>a</html>");
    const calls = [];
    const stdout = { write() {} };
    await uploadSite({
      root,
      env: { R2_ACCESS_KEY_ID: "AKIA", R2_SECRET_ACCESS_KEY: "secret" },
      stdout,
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init.method, headers: init.headers, body: Buffer.from(init.body) });
        return new Response("", { status: 200 });
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "PUT");
    assert.equal(calls[0].url, "https://3d28ddc0579eb80dd173c75d55be3768.r2.cloudflarestorage.com/domdoc/sdk-docs/a%20b.html");
    assert.equal(calls[0].body.toString(), "<html>a</html>");
    assert.equal(calls[0].headers["content-type"], "text/html; charset=utf-8");
    assert.equal(calls[0].headers["cache-control"], SHORT);
    assert.match(calls[0].headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIA\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=cache-control;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);

    const endpointCalls = [];
    await uploadSite({
      root,
      env: {
        R2_ACCESS_KEY_ID: "AKIA",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
        R2_BUCKET: "other-bucket",
      },
      stdout,
      fetchImpl: async (url, init) => {
        endpointCalls.push({ url: String(url), method: init.method });
        return new Response("", { status: 200 });
      },
    });
    assert.equal(endpointCalls[0].method, "PUT");
    assert.equal(endpointCalls[0].url, "https://example.r2.cloudflarestorage.com/other-bucket/sdk-docs/a%20b.html");

    const client = createR2Client({
      accessKeyId: "id",
      secretAccessKey: "secret",
      fetchImpl() {
        calls.push("fetch");
        return new Response("", { status: 200 });
      },
    });
    await assert.rejects(() => client.send({ name: "DeleteObject", input: { Key: "sdk-docs/x" } }), /refusing DeleteObject\)/);
    await assert.rejects(() => client.send({ name: "DeleteObjects", input: {} }), /refusing DeleteObjects\)/);
    assert.equal(calls.includes("fetch"), false);
  });

  test("authorization header matches the AWS SigV4 GET example", () => {
    const header = authorizationHeader({
      method: "GET",
      canonicalUri: "/test.txt",
      headers: {
        host: "examplebucket.s3.amazonaws.com",
        range: "bytes=0-9",
        "x-amz-content-sha256": EMPTY_HASH,
        "x-amz-date": "20130524T000000Z",
      },
      payloadHash: EMPTY_HASH,
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      amzDate: "20130524T000000Z",
      region: "us-east-1",
    });
    assert.equal(
      header,
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  test("CLI --dry-run prints keys and a missing build or missing credentials fails", () => {
    const root = tree("cli");
    write(join(root, "index.html"), "<html></html>");
    write(join(root, "assets", "main.js"), "js");
    const dry = spawnSync(process.execPath, [script, "--dry-run", "--root", root], { encoding: "utf8", env: cleanEnv() });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /sdk-docs\/index\.html\ttext\/html; charset=utf-8\tpublic, max-age=60, must-revalidate/);
    assert.match(dry.stdout, /sdk-docs\/assets\/main\.js\ttext\/javascript; charset=utf-8\tpublic, max-age=31536000, immutable/);
    assert.match(dry.stderr, /dry-run 2 object\(s\), nothing sent/);

    const missing = spawnSync(process.execPath, [script, "--dry-run", "--root", join(root, "missing")], { encoding: "utf8", env: cleanEnv() });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /docs build .* does not exist/);

    const creds = spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8", env: cleanEnv() });
    assert.notEqual(creds.status, 0);
    assert.match(creds.stderr, /R2_ACCESS_KEY_ID/);
    assert.equal(creds.stdout, "");
  });
});
