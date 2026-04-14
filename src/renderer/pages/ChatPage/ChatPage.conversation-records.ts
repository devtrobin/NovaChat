import { ChatMessage, Conversation } from "../../types/chat.types";

export function createConversation(): Conversation {
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    id: crypto.randomUUID(),
    lastReadAt: createdAt,
    messages: [],
    title: "Nouvelle conversation",
    updatedAt: createdAt,
  };
}

export function createConversationRecord(conversationId: string): Conversation {
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    id: conversationId,
    lastReadAt: undefined,
    messages: [],
    title: "Nouvelle conversation",
    updatedAt: createdAt,
  };
}

export function createUserMessage(content: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    from: "user",
    id: crypto.randomUUID(),
    to: "assistant",
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
