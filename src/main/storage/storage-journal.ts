import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { StorageIssue } from "./storage.types";

let journalPath: string | null = null;
let journalQueue = Promise.resolve();

export function configureStorageJournal(filePath: string): void {
  journalPath = filePath;
}

export function reportStorageIssue(issue: StorageIssue): void {
  if (!journalPath) return;
  journalQueue = journalQueue
    .then(async () => {
      if (!journalPath) return;
      await mkdir(path.dirname(journalPath), { recursive: true });
      await appendFile(journalPath, `${JSON.stringify(issue)}\n`, "utf8");
    })
    .catch((): undefined => undefined);
}

export async function flushStorageJournal(): Promise<void> {
  await journalQueue;
}
