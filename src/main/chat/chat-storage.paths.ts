import path from "node:path";
import { ChatMessage } from "../../renderer/types/chat.types";

export function sanitizeTimestamp(value: string): string {
  return value
    .replace(/\.\d{3}Z$/, (match) => match.replace(/[.:]/g, "-"))
    .replace(/[^0-9TZ-]/g, "-")
    .replace(/-+/g, "-");
}

export function getConversationDirectory(rootDirectory: string, conversationId: string): string {
  return path.join(rootDirectory, conversationId);
}

export function getMessageDirectory(rootDirectory: string, conversationId: string, message: ChatMessage): string {
  return path.join(
    getConversationDirectory(rootDirectory, conversationId),
    `${sanitizeTimestamp(message.createdAt)}__${message.id}`,
  );
}
