import path from "node:path";
import { DESTRUCTIVE_PATH_NAMES } from "./device.policy.constants";
import { DeviceCommandRiskCategory } from "./device.policy.types";

export function getUnsafeWriteRiskCategory(
  targetPaths: string[],
  allowedWriteRoots: string[],
): DeviceCommandRiskCategory | null {
  let finalCategory: DeviceCommandRiskCategory | null = null;
  for (const targetPath of targetPaths) {
    const category = classifyUnsafeWriteTarget(targetPath, allowedWriteRoots);
    if (!category) continue;
    if (category === "unclassified") return category;
    if (category === "system") finalCategory = category;
    else if (!finalCategory) finalCategory = category;
  }
  return finalCategory;
}

export function isSystemLikePath(value: string): boolean {
  const normalizedValue = path.resolve(value);
  const prefixes = [
    "/Applications",
    "/Library",
    "/System",
    "/bin",
    "/etc",
    "/sbin",
    "/usr",
    process.env.ProgramData,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.SystemRoot,
  ].filter((prefix): prefix is string => Boolean(prefix));

  return prefixes.some((prefix) => isInsideRoot(normalizedValue, prefix));
}

export function looksLikePath(value: string): boolean {
  return /[\\/]/.test(value) || value.startsWith(".") || path.isAbsolute(value);
}

function classifyUnsafeWriteTarget(
  targetPath: string,
  allowedWriteRoots: string[],
): DeviceCommandRiskCategory | null {
  if (hasDynamicPath(targetPath)) return "unclassified";
  const expandedPath = expandHomePath(targetPath);
  const resolvedPath = path.resolve(process.cwd(), expandedPath);
  if (DESTRUCTIVE_PATH_NAMES.has(path.basename(resolvedPath).toLowerCase())) return "system";
  if (isSystemLikePath(resolvedPath)) return "system";
  return allowedWriteRoots.some((root) => isInsideRoot(resolvedPath, root))
    ? null
    : "workspace-write";
}

function expandHomePath(value: string): string {
  if (value !== "~" && !value.startsWith("~/") && !value.startsWith("~\\")) return value;
  const home = process.env.HOME ?? process.env.USERPROFILE;
  return home ? path.join(home, value.slice(2)) : value;
}

function hasDynamicPath(value: string): boolean {
  return /[$%*?[\]{}]/.test(value);
}

function isInsideRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedRoot = normalizePathForComparison(path.resolve(rootPath));
  const normalizedCandidate = normalizePathForComparison(path.resolve(candidatePath));
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

function normalizePathForComparison(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}
