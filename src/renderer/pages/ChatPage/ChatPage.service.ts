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
      messages: replaceMessage(targetConversation.messages, event.messageId, event.message),
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
