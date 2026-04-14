import { ChatTurnEvent } from "../../../shared/ai.types";
import { createDefaultChatState } from "../../services/conversation.service";
import {
  ChatMessage,
  Conversation,
} from "../../types/chat.types";
import { ChatPageState } from "./ChatPage.types";

export function loadChatPageState(): ChatPageState {
  const storedState = createDefaultChatState();

  return {
    activeConversationId: storedState.activeConversationId,
    conversations: storedState.conversations,
    isSending: false,
  };
}

export function createConversation(): Conversation {
  const createdAt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    lastReadAt: createdAt,
    title: "Nouvelle conversation",
    createdAt,
    updatedAt: createdAt,
    messages: [],
  };
}

export function createUserMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    from: "user",
    to: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function replaceConversation(
  conversations: Conversation[],
  nextConversation: Conversation,
): Conversation[] {
  const existingIndex = conversations.findIndex((conversation) => conversation.id === nextConversation.id);
  if (existingIndex === -1) {
    return [nextConversation, ...conversations];
  }

  return conversations.map((conversation) => (
    conversation.id === nextConversation.id ? nextConversation : conversation
  ));
}

export function removeMessage(messages: ChatMessage[], messageId: string): ChatMessage[] {
  return messages.filter((message) => message.id !== messageId);
}

export function replaceMessage(
  messages: ChatMessage[],
  messageId: string,
  nextMessage: ChatMessage,
): ChatMessage[] {
  return messages.map((message) => (message.id === messageId ? nextMessage : message));
}

export function replaceOrAppendMessage(
  messages: ChatMessage[],
  messageId: string,
  nextMessage: ChatMessage,
): ChatMessage[] {
  const hasMessage = messages.some((message) => message.id === messageId);
  if (!hasMessage) {
    return [...messages, nextMessage];
  }

  return replaceMessage(messages, messageId, nextMessage);
}

export function renameConversation(
  conversations: Conversation[],
  conversationId: string,
  title: string,
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? {
          ...conversation,
          title,
          updatedAt: new Date().toISOString(),
        }
      : conversation,
  );
}

export function normalizeConversationTitle(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function deleteConversation(
  conversations: Conversation[],
  conversationId: string,
): Conversation[] {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}

export function getNextActiveConversationId(
  conversations: Conversation[],
  deletedConversationId: string,
): string | null {
  const deletedIndex = conversations.findIndex((conversation) => conversation.id === deletedConversationId);
  if (deletedIndex === -1) return conversations[0]?.id ?? null;

  const remainingConversations = deleteConversation(conversations, deletedConversationId);
  return remainingConversations[deletedIndex]?.id
    ?? remainingConversations[deletedIndex - 1]?.id
    ?? null;
}

export function applyChatTurnEvent(
  conversations: Conversation[],
  event: ChatTurnEvent,
): Conversation[] {
  const targetConversation = conversations.find((conversation) => conversation.id === event.conversationId)
    ?? {
      createdAt: new Date().toISOString(),
      id: event.conversationId,
      lastReadAt: undefined,
      messages: [],
      title: "Nouvelle conversation",
      updatedAt: new Date().toISOString(),
    };

  const baseConversations = conversations.some((conversation) => conversation.id === event.conversationId)
    ? conversations
    : [targetConversation, ...conversations];

  if (event.type === "append-messages") {
    const lastMessage = event.messages[event.messages.length - 1];
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: [...targetConversation.messages, ...event.messages],
      updatedAt: lastMessage?.createdAt ?? targetConversation.updatedAt,
    });
  }

  if (event.type === "replace-message") {
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: replaceOrAppendMessage(targetConversation.messages, event.messageId, event.message),
      updatedAt: event.message.createdAt,
    });
  }

  if (event.type === "remove-message") {
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: removeMessage(targetConversation.messages, event.messageId),
    });
  }

  return replaceConversation(baseConversations, {
    ...targetConversation,
    title: event.title,
    updatedAt: new Date().toISOString(),
  });
}

export function markConversationAsRead(
  conversations: Conversation[],
  conversationId: string,
): Conversation[] {
  let didChange = false;
  const nextConversations = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    const latestVisibleMessage = [...conversation.messages]
      .filter((message) => message.from !== "user")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (!latestVisibleMessage) return conversation;
    if (conversation.lastReadAt && conversation.lastReadAt >= latestVisibleMessage.createdAt) {
      return conversation;
    }

    didChange = true;
    return {
      ...conversation,
      lastReadAt: latestVisibleMessage.createdAt,
    };
  });

  return didChange ? nextConversations : conversations;
}

export function getConversationUnreadCount(conversation: Conversation): number {
  return conversation.messages.filter((message) => (
    message.from !== "user"
    && (!conversation.lastReadAt || message.createdAt > conversation.lastReadAt)
  )).length;
}

export function hasConversationRunningSystemMessage(conversation: Conversation): boolean {
  return conversation.messages.some((message) => (
    message.from === "system"
    && message.status === "running"
  ));
}
