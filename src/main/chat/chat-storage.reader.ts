import { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  ApiRequestRecord,
  ChatMessage,
  MessageLifecycleEntry,
  PersistedChatState,
} from "../../shared/chat.types";
import { reportStorageIssue } from "../storage/storage-journal";
import { StorageIssue } from "../storage/storage.types";
import {
  createStorageIssue,
  readJsonFileDetailed,
} from "./chat-storage.io";
import { getConversationDirectory } from "./chat-storage.paths";
import { mergeMessageFiles, orderMessages } from "./chat-storage.serialization";
import { ConversationIndexEntry, ConversationsIndex } from "./chat-storage.types";

export type ChatStorageLoadResult = {
  issues: StorageIssue[];
  state: PersistedChatState | null;
};

async function readConversationMessages(
  rootDirectory: string,
  conversation: ConversationIndexEntry,
): Promise<{ issues: StorageIssue[]; messages: ChatMessage[] }> {
  const issues: StorageIssue[] = [];
  const conversationDirectory = getConversationDirectory(rootDirectory, conversation.id);
  const entries = await readDirectory(conversationDirectory, issues);
  const messages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const messageDirectory = path.join(conversationDirectory, entry.name);
        const messageBody = await readJsonFileDetailed<Omit<ChatMessage, "apiRequests" | "lifecycleLog">>(
          path.join(messageDirectory, "message.json"),
        );
        issues.push(...messageBody.issues);
        if (!messageBody.value) return null;

        const lifecycleLog = await readJsonFileDetailed<MessageLifecycleEntry[]>(
          path.join(messageDirectory, "log.json"),
        );
        const apiRequests = await readJsonFileDetailed<ApiRequestRecord[]>(
          path.join(messageDirectory, "apis.json"),
        );
        issues.push(...lifecycleLog.issues, ...apiRequests.issues);

        return mergeMessageFiles(messageBody.value, lifecycleLog.value, apiRequests.value);
      }),
  );
  const orderedMessages = orderMessages(
    messages.filter((message): message is NonNullable<typeof message> => Boolean(message)),
    conversation,
  );
  const loadedIds = new Set(orderedMessages.map((message) => message.id));
  for (const expectedMessageId of conversation.messageIds) {
    if (loadedIds.has(expectedMessageId)) continue;
    const issue = createStorageIssue(
      conversationDirectory,
      "missing-indexed-data",
      `Le message indexe ${expectedMessageId} n'a pas pu etre charge.`,
    );
    reportStorageIssue(issue);
    issues.push(issue);
  }

  return {
    issues,
    messages: orderedMessages,
  };
}

function createFallbackConversationEntry(
  conversationId: string,
  messages: ChatMessage[],
): ConversationIndexEntry {
  const orderedMessages = [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const createdAt = orderedMessages[0]?.createdAt ?? new Date().toISOString();
  const updatedAt = orderedMessages[orderedMessages.length - 1]?.createdAt ?? createdAt;
  const seedMessage = orderedMessages.find((message) => typeof message.content === "string" && message.content.trim())
    ?? orderedMessages[0]
    ?? null;

  return {
    createdAt,
    draft: "",
    id: conversationId,
    messageIds: orderedMessages.map((message) => message.id),
    origin: "assistant",
    title: seedMessage?.content?.trim().slice(0, 48) || conversationId,
    updatedAt,
  };
}

export async function loadChatStateFromDirectory(rootDirectory: string): Promise<PersistedChatState | null> {
  return (await loadChatStateFromDirectoryWithRecovery(rootDirectory)).state;
}

export async function loadChatStateFromDirectoryWithRecovery(
  rootDirectory: string,
): Promise<ChatStorageLoadResult> {
  const issues: StorageIssue[] = [];
  const indexResult = await readJsonFileDetailed<ConversationsIndex>(
    path.join(rootDirectory, "conversations.json"),
  );
  issues.push(...indexResult.issues);
  const index = indexResult.value;
  const directoryEntries = await readDirectory(rootDirectory, issues);
  const indexedConversations = new Map(index?.conversations.map((conversation) => [conversation.id, conversation]) ?? []);
  const discoveredConversationIds = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const allConversationIds = [
    ...new Set([
      ...indexedConversations.keys(),
      ...discoveredConversationIds,
    ]),
  ];

  if (!index && allConversationIds.length === 0) {
    return {
      issues,
      state: null,
    };
  }

  const conversations = await Promise.all(
    allConversationIds.map(async (conversationId) => {
      const indexedConversation = indexedConversations.get(conversationId);
      const lookupEntry = indexedConversation ?? {
        createdAt: "",
        id: conversationId,
        messageIds: [],
        title: conversationId,
        updatedAt: "",
      };
      const loadedMessages = await readConversationMessages(rootDirectory, lookupEntry);
      issues.push(...loadedMessages.issues);
      const conversation = indexedConversation
        ?? createFallbackConversationEntry(conversationId, loadedMessages.messages);

      return {
        createdAt: conversation.createdAt,
        draft: conversation.draft ?? "",
        id: conversation.id,
        lastReadAt: conversation.lastReadAt,
        messages: loadedMessages.messages,
        origin: conversation.origin ?? "assistant",
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      };
    }),
  );

  conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    issues,
    state: {
      activeConversationId: index?.activeConversationId ?? conversations[0]?.id ?? null,
      conversations,
    },
  };
}

async function readDirectory(directoryPath: string, issues: StorageIssue[]): Promise<Dirent[]> {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    const issue = createStorageIssue(
      directoryPath,
      "io-error",
      error instanceof Error ? error.message : "Lecture du dossier impossible.",
    );
    reportStorageIssue(issue);
    issues.push(issue);
    return [];
  }
}
