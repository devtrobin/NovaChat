import { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  ApiRequestRecord,
  ChatMessage,
  MessageLifecycleEntry,
  PersistedChatState,
} from "../../renderer/types/chat.types";
import { readJsonFile } from "./chat-storage.io";
import { getConversationDirectory } from "./chat-storage.paths";
import { mergeMessageFiles, orderMessages } from "./chat-storage.serialization";
import { ConversationIndexEntry, ConversationsIndex } from "./chat-storage.types";

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

        return mergeMessageFiles(messageBody, lifecycleLog, apiRequests);
      }),
  );

  return orderMessages(
    messages.filter((message): message is NonNullable<typeof message> => Boolean(message)),
    conversation,
  );
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
  const index = await readJsonFile<ConversationsIndex>(path.join(rootDirectory, "conversations.json"));
  const directoryEntries = await readdir(rootDirectory, { withFileTypes: true }).catch(
    (): Dirent[] => [],
  );
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

  if (!index && allConversationIds.length === 0) return null;

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
      const messages = await readConversationMessages(rootDirectory, lookupEntry);
      const conversation = indexedConversation ?? createFallbackConversationEntry(conversationId, messages);

      return {
        createdAt: conversation.createdAt,
        draft: conversation.draft ?? "",
        id: conversation.id,
        lastReadAt: conversation.lastReadAt,
        messages,
        origin: conversation.origin ?? "assistant",
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      };
    }),
  );

  conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    activeConversationId: index?.activeConversationId ?? conversations[0]?.id ?? null,
    conversations,
  };
}
