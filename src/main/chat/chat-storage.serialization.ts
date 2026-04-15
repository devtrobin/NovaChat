import {
  ApiRequestRecord,
  ChatMessage,
  MessageLifecycleEntry,
  PersistedChatState,
} from "../../renderer/types/chat.types";
import { ConversationIndexEntry, ConversationsIndex } from "./chat-storage.types";

export function toIndex(state: PersistedChatState): ConversationsIndex {
  return {
    activeConversationId: state.activeConversationId,
    conversations: state.conversations.map((conversation) => ({
      createdAt: conversation.createdAt,
      draft: conversation.draft ?? "",
      id: conversation.id,
      lastReadAt: conversation.lastReadAt,
      messageIds: conversation.messages.map((message) => message.id),
      title: conversation.title,
      updatedAt: conversation.updatedAt,
    })),
  };
}

export function splitMessageFiles(message: ChatMessage) {
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

export function mergeMessageFiles(
  messageBody: Omit<ChatMessage, "apiRequests" | "lifecycleLog">,
  lifecycleLog: MessageLifecycleEntry[] | null,
  apiRequests: ApiRequestRecord[] | null,
): ChatMessage {
  return {
    ...messageBody,
    apiRequests: apiRequests ?? [],
    lifecycleLog: lifecycleLog ?? [],
  };
}

export function orderMessages(
  messages: ChatMessage[],
  conversation: ConversationIndexEntry,
): ChatMessage[] {
  const orderedMessages = messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const orderedByIndex = conversation.messageIds
    .map((messageId) => orderedMessages.find((message) => message.id === messageId))
    .filter((message): message is NonNullable<typeof message> => Boolean(message));

  return orderedByIndex.length > 0 ? orderedByIndex : orderedMessages;
}
