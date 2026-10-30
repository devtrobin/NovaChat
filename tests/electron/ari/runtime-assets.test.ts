import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { copyRuntimeDependencies } from "../../../forge.runtime-assets";

const directories: string[] = [];

async function fixture(packages: Record<string, { dev?: boolean; optional?: boolean }>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "novachat-runtime-assets-"));
  directories.push(root);
  const project = path.join(root, "project");
  const target = path.join(root, "package");
  await mkdir(project);
  await writeFile(path.join(project, "package-lock.json"), JSON.stringify({ packages }));
  return { project, target };
}

async function file(root: string, relative: string, content: string) {
  const destination = path.join(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(directory));
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Unsafe cleanup path");
    await rm(directory, { recursive: true, force: true });
  }
});

describe("packaged runtime assets", () => {
  it("keeps ESM worker assets and excludes dev dependencies", async () => {
    const { project, target } = await fixture({
      "": {}, "node_modules/pdfjs-dist": {}, "node_modules/typescript": { dev: true },
    });
    await file(project, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "worker fixture");
    await file(project, "node_modules/typescript/package.json", "{}");
    await copyRuntimeDependencies(target, project);
    expect(await readFile(path.join(target, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"), "utf8")).toBe("worker fixture");
    await expect(stat(path.join(target, "node_modules/typescript"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("skips absent optional platform packages", async () => {
    const { project, target } = await fixture({ "node_modules/optional-native": { optional: true } });
    await expect(copyRuntimeDependencies(target, project)).resolves.toBeUndefined();
  });

  it("fails on a missing required dependency", async () => {
    const { project, target } = await fixture({ "node_modules/required-library": {} });
    await expect(copyRuntimeDependencies(target, project)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses lockfile paths that escape the project", async () => {
    const { project, target } = await fixture({ "node_modules/../../outside": {} });
    await expect(copyRuntimeDependencies(target, project)).rejects.toThrow("escapes its package root");
  });
});
