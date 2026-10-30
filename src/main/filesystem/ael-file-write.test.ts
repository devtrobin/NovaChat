import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeFileWrite, prepareFileWrite } from "./ael-file-write";

const hooks = vi.hoisted(() => ({ afterPublish: undefined as (() => Promise<void> | void) | undefined }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, link: async (...args: Parameters<typeof actual.link>) => {
    await actual.link(...args);
    await hooks.afterPublish?.();
  } };
});

let root: string;
let desktop: string;
const operation = { action: "write-file", target: { directory: "desktop", name: "coucou.py" }, content: 'print("coucou")\n', overwrite: false };
const signal = () => new AbortController().signal;
const prepare = (value = operation) => prepareFileWrite(value, { desktop, workspace: root, protectedPaths: [path.join(root, "private")] });

beforeEach(async () => {
  hooks.afterPublish = undefined;
  root = await mkdtemp(path.join(os.tmpdir(), "novachat-file-test-"));
  desktop = path.join(root, "Desktop");
  await mkdir(desktop);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("main file creation", () => {
  it("reports a late Stop after publication while preserving and verifying the created file", async () => {
    const preview = await prepare();
    const controller = new AbortController();
    hooks.afterPublish = () => controller.abort();
    const result = await executeFileWrite(preview, controller.signal);
    expect(result).toMatchObject({ verified: true, warnings: [expect.stringContaining("Arret recu")] });
    expect(await readFile(preview.path, "utf8")).toBe(operation.content);
    expect(await readdir(desktop)).toEqual(["coucou.py"]);
  });

  it("reports creation without claiming verification if the bytes change after publication", async () => {
    const preview = await prepare();
    hooks.afterPublish = () => writeFile(preview.path, "corrupted");
    await expect(executeFileWrite(preview, signal())).rejects.toMatchObject({ createdPath: preview.path, message: expect.stringContaining("verification a echoue") });
    expect(await readdir(desktop)).toEqual(["coucou.py"]);
  });
  it("creates the exact UTF-8 bytes, verifies them and consumes preparation once", async () => {
    const content = '\nif True:\n    print("coucou é %USERPROFILE% $(x) <script>")\r\n';
    const preview = await prepare({ ...operation, content });
    expect(await readdir(desktop)).toEqual([]);
    const result = await executeFileWrite(preview, signal());
    expect(await readFile(preview.path, "utf8")).toBe(content);
    expect(result).toMatchObject({ verified: true, byteLength: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex"), warnings: [] });
    expect(await readdir(desktop)).toEqual(["coucou.py"]);
    await expect(executeFileWrite(preview, signal())).rejects.toThrow("deja consommee");
  });

  it("creates an empty file", async () => {
    const preview = await prepare({ ...operation, content: "" });
    await executeFileWrite(preview, signal());
    expect(await readFile(preview.path, "utf8")).toBe("");
  });

  it("preserves an existing file both before and after permission", async () => {
    const preview = await prepare();
    await writeFile(preview.path, "keep");
    await expect(prepare()).rejects.toThrow("existe deja");
    await expect(executeFileWrite(preview, signal())).rejects.toThrow("existe deja");
    expect(await readFile(preview.path, "utf8")).toBe("keep");
    expect(await readdir(desktop)).toEqual(["coucou.py"]);
  });

  it("publishes only one complete payload when two approved creations race", async () => {
    const previews = await Promise.all([prepare(), prepare({ ...operation, content: "other" })]);
    const results = await Promise.allSettled(previews.map((preview) => executeFileWrite(preview, signal())));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect([operation.content, "other"]).toContain(await readFile(previews[0].path, "utf8"));
    expect(await readdir(desktop)).toEqual(["coucou.py"]);
  });

  it("refuses a replaced directory after permission", async () => {
    const preview = await prepare();
    await rename(desktop, path.join(root, "old-desktop"));
    await mkdir(desktop);
    await expect(executeFileWrite(preview, signal())).rejects.toThrow("dossier cible a change");
    expect(await readdir(desktop)).toEqual([]);
  });

  it("refuses entries that are links and protected storage roots", async () => {
    await symlink(root, path.join(desktop, "coucou.py"), "junction");
    await expect(prepare()).rejects.toThrow("existe deja");
    await expect(prepareFileWrite(operation, { desktop, workspace: root, protectedPaths: [root] })).rejects.toThrow("internes");
  });

  it("protects a not-yet-created internal file configured through a directory alias", async () => {
    const alias = path.join(root, "alias");
    await symlink(desktop, alias, "junction");
    await expect(prepareFileWrite(operation, { desktop, workspace: root, protectedPaths: [path.join(alias, "coucou.py")] })).rejects.toThrow("internes");
  });

  it("refuses a forged preview and an aborted write without leaving files", async () => {
    const preview = await prepare();
    await expect(executeFileWrite({ ...preview }, signal())).rejects.toThrow("inconnue");
    const controller = new AbortController();
    controller.abort();
    await expect(executeFileWrite(preview, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(await readdir(desktop)).toEqual([]);
  });
});
