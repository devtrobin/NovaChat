import { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ApiRequestRecord,
  ChatMessage,
  MessageLifecycleEntry,
  PersistedChatState,
} from "../../renderer/types/chat.types";

type ConversationIndexEntry = {
  createdAt: string;
  id: string;
  messageIds: string[];
  title: string;
  updatedAt: string;
};

type ConversationsIndex = {
  activeConversationId: string | null;
  conversations: ConversationIndexEntry[];
};

function sanitizeTimestamp(value: string): string {
  return value
    .replace(/\.\d{3}Z$/, (match) => match.replace(/[.:]/g, "-"))
    .replace(/[^0-9TZ-]/g, "-")
    .replace(/-+/g, "-");
}

function getConversationDirectory(rootDirectory: string, conversationId: string): string {
  return path.join(rootDirectory, conversationId);
}

function getMessageDirectory(rootDirectory: string, conversationId: string, message: ChatMessage): string {
  return path.join(
    getConversationDirectory(rootDirectory, conversationId),
    `${sanitizeTimestamp(message.createdAt)}__${message.id}`,
  );
}

function toIndex(state: PersistedChatState): ConversationsIndex {
  return {
    activeConversationId: state.activeConversationId,
    conversations: state.conversations.map((conversation) => ({
      createdAt: conversation.createdAt,
      id: conversation.id,
      messageIds: conversation.messages.map((message) => message.id),
      title: conversation.title,
      updatedAt: conversation.updatedAt,
    })),
  };
}

function splitMessageFiles(message: ChatMessage) {
  const {
    apiRequests = [],
    lifecycleLog = [],
    ...messageBody
  } = message;

  return {
    apiRequests,
    lifecycleLog,
    messageBody,
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

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

async function readConversationMessages(rootDirectory: string, conversation: ConversationIndexEntry): Promise<ChatMessage[]> {
  const conversationDirectory = getConversationDirectory(rootDirectory, conversation.id);
  const entries = await readdir(conversationDirectory, { withFileTypes: true }).catch(
    (): Dirent[] => [],
  );
  const messages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const messageDirectory = path.join(conversationDirectory, entry.name);
        const messageBody = await readJsonFile<Omit<ChatMessage, "apiRequests" | "lifecycleLog">>(
          path.join(messageDirectory, "message.json"),
        );
        if (!messageBody) return null;

        const lifecycleLog = await readJsonFile<MessageLifecycleEntry[]>(path.join(messageDirectory, "log.json"));
        const apiRequests = await readJsonFile<ApiRequestRecord[]>(path.join(messageDirectory, "apis.json"));

        return {
          ...messageBody,
          apiRequests: apiRequests ?? [],
          lifecycleLog: lifecycleLog ?? [],
        } satisfies ChatMessage;
      }),
  );

  const orderedMessages = messages
    .filter((message): message is NonNullable<typeof message> => Boolean(message))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  const orderedByIndex = conversation.messageIds
    .map((messageId) => orderedMessages.find((message) => message.id === messageId))
    .filter((message): message is NonNullable<typeof message> => Boolean(message));

  return orderedByIndex.length > 0 ? orderedByIndex : orderedMessages;
}

export async function loadChatStateFromDirectory(rootDirectory: string): Promise<PersistedChatState | null> {
  const index = await readJsonFile<ConversationsIndex>(path.join(rootDirectory, "conversations.json"));
  if (!index) return null;

  const conversations = await Promise.all(
    index.conversations.map(async (conversation) => ({
      createdAt: conversation.createdAt,
      id: conversation.id,
      messages: await readConversationMessages(rootDirectory, conversation),
      title: conversation.title,
      updatedAt: conversation.updatedAt,
    })),
  );

  return {
    activeConversationId: index.activeConversationId,
    conversations,
  };
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
