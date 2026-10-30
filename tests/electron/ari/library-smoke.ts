import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { load } from "cheerio";
import { MockAgent, request } from "undici";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import iconv from "iconv-lite";
import robotsParser from "robots-parser";
import { getDomain } from "tldts";
import { createTextPDF } from "./pdf-fixture";

export async function checkLibraries(): Promise<Record<string, boolean>> {
  const paragraph = "This local fixture documents NovaChat research qualification. ".repeat(30);
  const html = `<html><head><title>ARI fixture</title></head><body><article><h1>Qualification</h1><p>${paragraph}</p></article><script>globalThis.ariInjected = true</script></body></html>`;
  assert.equal(load(html)("h1").text(), "Qualification");
  const dom = new JSDOM(html, {
    url: "https://fixture.invalid/",
    // jsdom 30 keeps subresource loading disabled unless resources is enabled.
    virtualConsole: new VirtualConsole(),
  });
  try {
    assert.equal(Reflect.has(dom.window, "ariInjected"), false);
    assert.ok(new Readability(dom.window.document).parse()?.textContent?.includes("NovaChat"));
  } finally { dom.window.close(); }

  const dispatcher = new MockAgent();
  dispatcher.disableNetConnect();
  dispatcher.get("https://fixture.invalid").intercept({ path: "/text", method: "GET" }).reply(200, "offline");
  try {
    const response = await request("https://fixture.invalid/text", { dispatcher });
    assert.equal(await response.body.text(), "offline");
  } finally { await dispatcher.close(); }

  const robots = robotsParser("https://fixture.invalid/robots.txt", "User-agent: *\nDisallow: /private\n");
  assert.equal(robots.isAllowed("https://fixture.invalid/private", "NovaChatARI"), false);
  assert.equal(robots.isAllowed("https://fixture.invalid/public", "NovaChatARI"), true);
  assert.equal(getDomain("nova.github.io", { allowPrivateDomains: true }), "nova.github.io");
  assert.equal(iconv.decode(iconv.encode("Résumé", "windows-1252"), "windows-1252"), "Résumé");
  const ajv = new Ajv({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile({ type: "object", properties: { url: { type: "string", format: "uri" } }, required: ["url"], additionalProperties: false });
  assert.equal(validate({ url: "https://fixture.invalid/" }), true);
  assert.equal(validate({ url: "not a URI", secret: "synthetic" }), false);

  await checkPDF();
  return { cheerio: true, jsdom: true, readability: true, undici: true, robots: true, tldts: true, iconv: true, ajv: true, pdfText: true, pdfNativeCanvas: true };
}

async function checkPDF(): Promise<void> {
  const nativeRequire = createRequire(__filename);
  const entry = nativeRequire.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  // Exercise the optional prebuilt N-API dependency, including ASAR unpacking.
  const canvas = createRequire(entry)("@napi-rs/canvas") as {
    createCanvas(width: number, height: number): { toBuffer(mime: "image/png"): Buffer };
  };
  assert.ok(canvas.createCanvas(2, 2).toBuffer("image/png").byteLength > 8);
  const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs", { with: { "resolution-mode": "import" } }) =
    await import(/* webpackIgnore: true */ pathToFileURL(entry).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(nativeRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const loading = pdfjs.getDocument({ data: createTextPDF(), useSystemFonts: false, disableFontFace: true, useWorkerFetch: false, enableXfa: false, useWasm: false });
  try {
    const pdf = await loading.promise;
    const content = await (await pdf.getPage(1)).getTextContent();
    assert.ok(content.items.some((item) => "str" in item && item.str.includes("NovaChat ARI qualification")));
    assert.equal(pdf.numPages, 1);
  } finally { await loading.destroy(); }
}
