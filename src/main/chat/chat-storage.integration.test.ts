import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Conversation, PersistedChatState } from "../../shared/chat.types";
import {
  loadChatStateFromDirectory,
  saveChatStateToDirectory,
} from "./chat-storage.service";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-storage-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("chat storage round trip", () => {
  it("persists and reloads a complete split conversation tree", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const state: PersistedChatState = {
      activeConversationId: "conversation-1",
      conversations: [{
        createdAt: "2026-07-18T10:00:00.000Z",
        draft: "brouillon",
        id: "conversation-1",
        lastReadAt: "2026-07-18T10:00:00.000Z",
        messages: [{
          apiRequests: [{
            at: "2026-07-18T10:00:00.000Z",
            direction: "response",
            from: "openai.responses",
            payload: { ok: true },
            to: "nova",
          }],
          content: "Bonjour",
          createdAt: "2026-07-18T10:00:00.000Z",
          from: "assistant",
          id: "message-1",
          lifecycleLog: [{
            at: "2026-07-18T10:00:00.000Z",
            event: "created",
          }],
          status: "success",
          to: "user",
        }],
        origin: "assistant",
        title: "Accueil",
        updatedAt: "2026-07-18T10:00:00.000Z",
      }],
    };

    await saveChatStateToDirectory(state, rootDirectory);
    expect(await loadChatStateFromDirectory(rootDirectory)).toEqual(state);
    expect(await readdir(rootDirectory)).toContain("conversations.json");

    const conversationEntries = await readdir(path.join(rootDirectory, "conversation-1"), { withFileTypes: true });
    const messageDirectory = conversationEntries.find((entry) => entry.isDirectory());
    expect(messageDirectory).toBeDefined();
    const messagePath = path.join(rootDirectory, "conversation-1", messageDirectory?.name ?? "");
    expect(await readdir(messagePath)).toEqual(expect.arrayContaining(["apis.json", "log.json", "message.json"]));
  });

  it("removes a conversation directory deleted from the next state", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const initialState: PersistedChatState = {
      activeConversationId: "conversation-1",
      conversations: [
        createEmptyConversation("conversation-1"),
        createEmptyConversation("conversation-2"),
      ],
    };

    await saveChatStateToDirectory(initialState, rootDirectory);
    await saveChatStateToDirectory({
      activeConversationId: "conversation-1",
      conversations: [initialState.conversations[0]],
    }, rootDirectory);
    expect(await readdir(rootDirectory)).not.toContain("conversation-2");
  });
});

function createEmptyConversation(id: string): Conversation {
  return {
    createdAt: "2026-07-18T10:00:00.000Z",
    draft: "",
    id,
    messages: [],
    origin: "assistant",
    title: id,
    updatedAt: "2026-07-18T10:00:00.000Z",
  };
}
