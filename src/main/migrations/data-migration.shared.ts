import { readFile, stat } from "node:fs/promises";
import { createStorageIssue } from "../chat/chat-storage.io";
import { reportStorageIssue } from "../storage/storage-journal";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function readJsonObject(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      reportStorageIssue(createStorageIssue(
        filePath,
        "invalid-json",
        error instanceof Error ? error.message : "Settings invalides.",
      ));
    }
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function formatTimestamp(value: Date): string {
  return value.toISOString().replace(/[:.]/g, "-");
}

export function dedupeByJson<T>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
