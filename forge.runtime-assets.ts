import { cp, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

type LockedPackage = { dev?: boolean; optional?: boolean };
type RuntimeLockfile = { packages: Record<string, LockedPackage> };

// The Webpack plugin removes node_modules. Keep the locked runtime libraries
// inside app.asar so ESM workers and library-relative assets still resolve.
export async function copyRuntimeDependencies(
  buildPath: string,
  projectDirectory = process.cwd(),
): Promise<void> {
  const lock = JSON.parse(await readFile(
    path.join(projectDirectory, "package-lock.json"), "utf8",
  )) as RuntimeLockfile;

  for (const [relativePath, entry] of Object.entries(lock.packages)) {
    if (!relativePath.startsWith("node_modules/") || entry.dev) continue;
    const source = confinedPath(projectDirectory, relativePath);
    try {
      await stat(source);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && entry.optional) continue;
      throw error;
    }
    const destination = confinedPath(buildPath, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: false });
  }
}

function confinedPath(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(path.resolve(root), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Runtime dependency path escapes its package root.");
  }
  return resolved;
}
