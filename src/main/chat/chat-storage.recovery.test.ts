import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PersistedChatState } from "../../shared/chat.types";
import {
  acknowledgeStorageRecovery,
  clearStorageRecoveryRegistry,
  registerStorageRecovery,
} from "../storage/storage-recovery.registry";
import { configureStorageJournal, flushStorageJournal } from "../storage/storage-journal";
import {
  readJsonFileDetailed,
  writeJsonFile,
} from "./chat-storage.io";
import {
  loadChatStateFromDirectoryWithRecovery,
  saveChatStateToDirectory,
} from "./chat-storage.service";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  clearStorageRecoveryRegistry();
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("recoverable JSON storage", () => {
  it("writes atomically and preserves the previous valid value as backup", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "state.json");

    await writeJsonFile(filePath, { revision: 1 });
    await writeJsonFile(filePath, { revision: 2 });

    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({ revision: 2 });
    expect(JSON.parse(await readFile(`${filePath}.bak`, "utf8"))).toEqual({ revision: 1 });
    expect((await readdir(directory)).some((entry) => entry.endsWith(".tmp"))).toBe(false);
  });

  it("restores a corrupt primary from backup, archives it and journals the error", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "state.json");
    const journalPath = path.join(directory, "storage-errors.jsonl");
    configureStorageJournal(journalPath);
    await writeJsonFile(filePath, { revision: 1 });
    await writeJsonFile(filePath, { revision: 2 });
    await writeFile(filePath, "{invalid", "utf8");

    const result = await readJsonFileDetailed<{ revision: number }>(filePath);
    await flushStorageJournal();

    expect(result).toMatchObject({
      status: "recovered",
      value: { revision: 1 },
    });
    expect(result.issues[0]).toMatchObject({
      kind: "invalid-json",
      recoveredFromBackup: true,
    });
    expect(result.issues[0]?.backupPath).toMatch(/\.corrupt-.*\.bak$/);
    expect(await readFile(journalPath, "utf8")).toContain("\"kind\":\"invalid-json\"");
  });

  it("detects missing indexed messages and blocks writes until acknowledgement", async () => {
    const directory = await createTemporaryDirectory();
    const state = createState();
    await saveChatStateToDirectory(state, directory);
    const messageDirectory = (await readdir(path.join(directory, "conversation-1"), { withFileTypes: true }))
      .find((entry) => entry.isDirectory());
    expect(messageDirectory).toBeDefined();
    await rm(path.join(directory, "conversation-1", messageDirectory?.name ?? ""), {
      force: true,
      recursive: true,
    });

    const loaded = await loadChatStateFromDirectoryWithRecovery(directory);
    expect(loaded.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "missing-indexed-data" }),
    ]));
    const notice = registerStorageRecovery(directory, loaded.issues);
    expect(notice).not.toBeNull();

    await expect(saveChatStateToDirectory(loaded.state ?? createState(), directory))
      .rejects.toThrow("sauvegarde est bloquee");
    expect(acknowledgeStorageRecovery(notice?.id ?? "")).toBe(true);
    await expect(saveChatStateToDirectory(loaded.state ?? createState(), directory)).resolves.toBeUndefined();
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-recovery-"));
  temporaryDirectories.push(directory);
  return directory;
}

function createState(): PersistedChatState {
  return {
    activeConversationId: "conversation-1",
    conversations: [{
      createdAt: "2026-07-18T10:00:00.000Z",
      id: "conversation-1",
      messages: [{
        content: "Bonjour",
        createdAt: "2026-07-18T10:00:00.000Z",
        from: "assistant",
        id: "message-1",
        to: "user",
      }],
      title: "Test",
      updatedAt: "2026-07-18T10:00:00.000Z",
    }],
  };
}
