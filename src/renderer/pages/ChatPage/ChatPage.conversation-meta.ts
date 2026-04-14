import { Conversation } from "../../types/chat.types";
import { deleteConversation } from "./ChatPage.deletion";

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
