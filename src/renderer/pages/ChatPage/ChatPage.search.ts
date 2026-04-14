import { Conversation } from "../../types/chat.types";

export function getConversationSearchMatches(
  conversation: Conversation | null,
  searchQuery: string,
): string[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!conversation || !normalizedQuery) return [];

  return conversation.messages
    .filter((message) => [message.content, message.result]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery)))
    .map((message) => message.id);
}
