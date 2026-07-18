import path from "node:path";

export function resolvePathWithinRoot(rootDirectory: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  if (
    relativePath === ""
    || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath))
  ) {
    return resolvedPath;
  }

  throw new Error("Le chemin resolu sort du repertoire autorise.");
}
