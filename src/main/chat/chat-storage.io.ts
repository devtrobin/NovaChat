import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { reportStorageIssue } from "../storage/storage-journal";
import { StorageIssue, StorageReadResult } from "../storage/storage.types";

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  return (await readJsonFileDetailed<T>(filePath)).value;
}

export async function readJsonFileDetailed<T>(filePath: string): Promise<StorageReadResult<T>> {
  const primary = await readJsonCandidate<T>(filePath);
  if (primary.status === "ok" || primary.status === "missing") {
    return primary;
  }

  const corruptBackupPath = await preserveCorruptFile(filePath);
  const backupPath = `${filePath}.bak`;
  const backup = await readJsonCandidate<T>(backupPath);
  const issue = createStorageIssue(
    filePath,
    primary.status === "invalid" ? "invalid-json" : "io-error",
    primary.issues[0]?.message ?? "Lecture impossible.",
    backup.status === "ok",
    corruptBackupPath,
  );
  reportStorageIssue(issue);

  if (backup.status === "ok") {
    return {
      issues: [issue],
      status: "recovered",
      value: backup.value,
    };
  }

  return {
    issues: [issue],
    status: "invalid",
    value: null,
  };
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(value, null, 2);
  await backupValidJsonFile(filePath);
  await writeFileAtomically(filePath, serialized);
}

export function createStorageIssue(
  filePath: string,
  kind: StorageIssue["kind"],
  message: string,
  recoveredFromBackup = false,
  backupPath?: string,
): StorageIssue {
  return {
    at: new Date().toISOString(),
    backupPath,
    filePath,
    kind,
    message,
    recoveredFromBackup,
  };
}

async function readJsonCandidate<T>(filePath: string): Promise<StorageReadResult<T>> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { issues: [], status: "missing", value: null };
    }
    return {
      issues: [{
        at: new Date().toISOString(),
        filePath,
        kind: "io-error",
        message: getErrorMessage(error),
        recoveredFromBackup: false,
      }],
      status: "invalid",
      value: null,
    };
  }

  try {
    return {
      issues: [],
      status: "ok",
      value: JSON.parse(content) as T,
    };
  } catch (error) {
    return {
      issues: [{
        at: new Date().toISOString(),
        filePath,
        kind: "invalid-json",
        message: getErrorMessage(error),
        recoveredFromBackup: false,
      }],
      status: "invalid",
      value: null,
    };
  }
}

async function backupValidJsonFile(filePath: string): Promise<void> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
    JSON.parse(content);
  } catch {
    return;
  }
  await writeFileAtomically(`${filePath}.bak`, content);
}

async function preserveCorruptFile(filePath: string): Promise<string | undefined> {
  const backupPath = `${filePath}.corrupt-${formatTimestamp(new Date())}.bak`;
  try {
    await copyFile(filePath, backupPath);
    return backupPath;
  } catch {
    return undefined;
  }
}

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  const handle = await open(temporaryPath, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch((): undefined => undefined);
    throw error;
  }
}

function formatTimestamp(value: Date): string {
  return value.toISOString().replace(/[:.]/g, "-");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Erreur de stockage inconnue.";
}
