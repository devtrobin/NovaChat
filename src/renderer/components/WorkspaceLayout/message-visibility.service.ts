import {
  ChatMessage,
  Conversation,
  MessageVisibility,
} from "../../../shared/chat.types";

export function filterConversationForUser(
  conversation: Conversation | null,
): Conversation | null {
  if (!conversation) return null;
  return {
    ...conversation,
    messages: conversation.messages.filter(
      (message) => resolveMessageVisibility(message) === "public",
    ),
  };
}

export function resolveMessageVisibility(
  message: ChatMessage,
): MessageVisibility {
  if (message.visibility) return message.visibility;
  if (message.from === "agent") return "internal";
  if (message.from === "ael") {
    return message.to === "user" ? "public" : "internal";
  }
  if (
    message.from === "assistant"
    && (message.to === "agent" || message.to === "ael")
  ) {
    return "internal";
  }
  if (message.from === "system" && message.to === "assistant") {
    return "internal";
  }
  return "public";
}
