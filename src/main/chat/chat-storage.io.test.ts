import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeJsonFile } from "./chat-storage.io";

const faults = vi.hoisted(() => ({ failures: 0, attempts: 0, code: "EPERM" }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: async (...args: Parameters<typeof actual.rename>) => {
    faults.attempts++;
    if (faults.failures-- > 0) throw Object.assign(new Error("synthetic file lock"), { code: faults.code });
    await actual.rename(...args);
  } };
});
let root: string;
const platform = Object.getOwnPropertyDescriptor(process, "platform");
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "novachat-rename-"));
  faults.failures = 0;
  faults.attempts = 0;
  faults.code = "EPERM";
  Object.defineProperty(process, "platform", { value: "win32" });
});
afterEach(async () => {
  if (platform) Object.defineProperty(process, "platform", platform);
  await rm(root, { recursive: true, force: true });
});
describe("Windows atomic JSON replacement", () => {
  it("retries a temporary lock while preserving the previous backup", async () => {
    const file = path.join(root, "state.json");
    await writeJsonFile(file, { revision: 1 });
    faults.failures = 2;
    await writeJsonFile(file, { revision: 2 });
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ revision: 2 });
    expect(JSON.parse(await readFile(`${file}.bak`, "utf8"))).toEqual({ revision: 1 });
    expect(await readdir(root)).toEqual(["state.json", "state.json.bak"]);
  });
  it("bounds retries and preserves the original file on persistent denial", async () => {
    const file = path.join(root, "state.json");
    await writeJsonFile(file, { revision: 1 });
    faults.attempts = 0;
    faults.failures = 100;
    await expect(writeJsonFile(file, { revision: 2 }, { createBackup: false })).rejects.toMatchObject({ code: "EPERM" });
    expect(faults.attempts).toBe(6);
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ revision: 1 });
    expect(await readdir(root)).toEqual(["state.json"]);
  });
  it("does not retry unrelated errors", async () => {
    faults.failures = 100;
    faults.code = "ENOSPC";
    await expect(writeJsonFile(path.join(root, "state.json"), {})).rejects.toMatchObject({ code: "ENOSPC" });
    expect(faults.attempts).toBe(1);
    expect(await readdir(root)).toEqual([]);
  });
});
