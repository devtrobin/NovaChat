import { Dirent } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { PersistedChatState } from "../../renderer/types/chat.types";
import { readJsonFile, writeJsonFile } from "./chat-storage.io";
import {
  getConversationDirectory,
  getMessageDirectory,
  sanitizeTimestamp,
} from "./chat-storage.paths";
import { splitMessageFiles, toIndex } from "./chat-storage.serialization";
import { ConversationsIndex } from "./chat-storage.types";

async function writeConversationTree(rootDirectory: string, state: PersistedChatState): Promise<void> {
  await mkdir(rootDirectory, { recursive: true });

  const previousIndex = await readJsonFile<ConversationsIndex>(path.join(rootDirectory, "conversations.json"));
  const previousConversationIds = new Set(previousIndex?.conversations.map((conversation) => conversation.id) ?? []);
  const nextConversationIds = new Set(state.conversations.map((conversation) => conversation.id));

  await Promise.all(
    [...previousConversationIds]
      .filter((conversationId) => !nextConversationIds.has(conversationId))
      .map((conversationId) => rm(getConversationDirectory(rootDirectory, conversationId), { force: true, recursive: true })),
  );

  for (const conversation of state.conversations) {
    const conversationDirectory = getConversationDirectory(rootDirectory, conversation.id);
    await mkdir(conversationDirectory, { recursive: true });
    const nextMessageDirectories = new Set(
      conversation.messages.map((message) => `${sanitizeTimestamp(message.createdAt)}__${message.id}`),
    );

    const existingEntries = await readdir(conversationDirectory, { withFileTypes: true }).catch(
      (): Dirent[] => [],
    );
    await Promise.all(
      existingEntries
        .filter((entry) => entry.isDirectory() && !nextMessageDirectories.has(entry.name))
        .map((entry) => rm(path.join(conversationDirectory, entry.name), { force: true, recursive: true })),
    );

    for (const message of conversation.messages) {
      const messageDirectory = getMessageDirectory(rootDirectory, conversation.id, message);
      const { apiRequests, lifecycleLog, messageBody } = splitMessageFiles(message);
      await mkdir(messageDirectory, { recursive: true });
      await writeJsonFile(path.join(messageDirectory, "message.json"), messageBody);
      await writeJsonFile(path.join(messageDirectory, "log.json"), lifecycleLog);
      await writeJsonFile(path.join(messageDirectory, "apis.json"), apiRequests);
    }
  }

  await writeJsonFile(path.join(rootDirectory, "conversations.json"), toIndex(state));
}

export async function saveChatStateToDirectory(
  state: PersistedChatState,
  rootDirectory: string,
): Promise<void> {
  await writeConversationTree(rootDirectory, state);
}

export async function saveChatStateToDirectories(
  state: PersistedChatState,
  activeDirectory: string,
  referenceDirectory: string,
  referenceIndexPath: string,
): Promise<void> {
  await writeConversationTree(referenceDirectory, state);
  await writeJsonFile(referenceIndexPath, toIndex(state));

  if (activeDirectory !== referenceDirectory) {
    await writeConversationTree(activeDirectory, state);
  }
}
