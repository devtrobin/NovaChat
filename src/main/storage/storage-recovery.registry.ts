import path from "node:path";
import { StorageRecoveryNotice } from "../../shared/chat.types";
import { StorageIssue } from "./storage.types";

type RecoveryEntry = {
  notice: StorageRecoveryNotice;
  rootDirectory: string;
};

const recoveryEntries = new Map<string, RecoveryEntry>();

export class StorageRecoveryRequiredError extends Error {
  constructor(public readonly notice: StorageRecoveryNotice) {
    super("La sauvegarde est bloquee car des donnees ont ete recuperees partiellement.");
    this.name = "StorageRecoveryRequiredError";
  }
}

export function registerStorageRecovery(
  rootDirectory: string,
  issues: StorageIssue[],
): StorageRecoveryNotice | null {
  if (issues.length === 0) return null;

  const normalizedRoot = path.resolve(rootDirectory);
  const existing = [...recoveryEntries.values()]
    .find((entry) => entry.rootDirectory === normalizedRoot);
  if (existing) {
    existing.notice.issues = dedupeIssues([...existing.notice.issues, ...issues]);
    return existing.notice;
  }

  const notice: StorageRecoveryNotice = {
    id: crypto.randomUUID(),
    issues: dedupeIssues(issues),
    message: [
      `${issues.length} anomalie${issues.length > 1 ? "s" : ""} de stockage detectee${issues.length > 1 ? "s" : ""}.`,
      "Les sauvegardes automatiques sont suspendues pour eviter une perte silencieuse.",
      "Les fichiers illisibles ont ete conserves lorsqu'une copie etait possible.",
    ].join(" "),
  };
  recoveryEntries.set(notice.id, {
    notice,
    rootDirectory: normalizedRoot,
  });
  return notice;
}

export function acknowledgeStorageRecovery(recoveryId: string): boolean {
  return recoveryEntries.delete(recoveryId);
}

export function assertStorageWritable(rootDirectory: string): void {
  const normalizedRoot = path.resolve(rootDirectory);
  const entry = [...recoveryEntries.values()]
    .find((candidate) => pathsOverlap(candidate.rootDirectory, normalizedRoot));
  if (entry) {
    throw new StorageRecoveryRequiredError(entry.notice);
  }
}

function pathsOverlap(left: string, right: string): boolean {
  return isInside(left, right) || isInside(right, left);
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function clearStorageRecoveryRegistry(): void {
  recoveryEntries.clear();
}

function dedupeIssues(issues: StorageRecoveryNotice["issues"]): StorageRecoveryNotice["issues"] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.filePath}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
