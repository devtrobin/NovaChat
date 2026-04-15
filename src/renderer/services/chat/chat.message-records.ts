import { ChatMessage } from "../../types/chat.types";

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
