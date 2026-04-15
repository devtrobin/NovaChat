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

export async function loadChatStateFromDirectory(rootDirectory: string): Promise<PersistedChatState | null> {
  const index = await readJsonFile<ConversationsIndex>(path.join(rootDirectory, "conversations.json"));
  if (!index) return null;

  const conversations = await Promise.all(
    index.conversations.map(async (conversation) => ({
      createdAt: conversation.createdAt,
      draft: conversation.draft ?? "",
      id: conversation.id,
      lastReadAt: conversation.lastReadAt,
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
