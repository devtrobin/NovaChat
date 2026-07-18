import { Conversation } from "../../../shared/chat.types";

export function deleteConversation(
  conversations: Conversation[],
  conversationId: string,
): Conversation[] {
  return conversations.filter((conversation) => conversation.id !== conversationId);
}
