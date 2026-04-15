import { Conversation } from "../../types/chat.types";

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
