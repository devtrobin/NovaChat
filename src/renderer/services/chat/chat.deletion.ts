import { Conversation } from "../../types/chat.types";

export function deleteConversation(
  conversations: Conversation[],
  conversationId: string,
): Conversation[] {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}
