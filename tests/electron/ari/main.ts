import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { app, safeStorage, session } from "electron";

const root = process.argv.find((arg) => arg.startsWith("--qualification-root="))?.slice("--qualification-root=".length);
if (!root || !path.isAbsolute(root) || !path.basename(root).startsWith("novachat-ari-qualification-")
  || readFileSync(path.join(root, ".qualification"), "utf8") !== "NovaChat ARI isolated test") {
  throw new Error("A fresh isolated qualification root is required.");
}
const qualificationRoot = root;
mkdirSync(path.join(root, "user-data"), { recursive: true });
app.setName("nova-chat-ari-qualification");
app.setPath("userData", path.join(root, "user-data"));
app.setPath("sessionData", path.join(root, "user-data"));

void app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (_details, callback) => callback({ cancel: true }));
  assert.equal(process.versions.electron, "44.10.0");
  assert.equal(safeStorage.isEncryptionAvailable(), true);
  if (process.platform === "linux") assert.notEqual(safeStorage.getSelectedStorageBackend(), "basic_text");
  const canaryPath = path.join(qualificationRoot, "canary.json");
  const expected = " NovaChat synthetic qualification canary ";
  let writtenBy: string | undefined = process.versions.electron;
  if (existsSync(canaryPath)) {
    const old = JSON.parse(readFileSync(canaryPath, "utf8")) as { ciphertext: string; electron: string };
    assert.equal(safeStorage.decryptString(Buffer.from(old.ciphertext, "base64")), expected);
    writtenBy = old.electron;
  }
  const encrypted = safeStorage.encryptString(expected);
  assert.notEqual(encrypted.toString(), expected);
  assert.equal(safeStorage.decryptString(encrypted), expected);
  // Load inside the error handler: a dependency failure must not open a native dialog.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { checkLibraries } = require("./library-smoke") as typeof import("./library-smoke");
  const libraries = await checkLibraries();
  const report = { ok: true, packaged: app.isPackaged, electron: process.versions.electron, node: process.versions.node, rssBytes: process.memoryUsage().rss, canaryWrittenBy: writtenBy, canaryReadable: true, libraries };
  const reportPath = path.join(qualificationRoot, app.isPackaged ? "packaged-report.json" : "development-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  app.quit();
}).catch((error: unknown) => {
  writeFileSync(path.join(qualificationRoot, "failure.json"), JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Qualification failed" }));
  app.exit(1);
});
