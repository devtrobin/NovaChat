import { ChatMessage } from "../../shared/chat.types";
import { resolvePathWithinRoot } from "../filesystem/safe-path";

export function sanitizeTimestamp(value: string): string {
  return value
    .replace(/\.\d{3}Z$/, (match) => match.replace(/[.:]/g, "-"))
    .replace(/[^0-9TZ-]/g, "-")
    .replace(/-+/g, "-");
}

export function getConversationDirectory(rootDirectory: string, conversationId: string): string {
  return resolvePathWithinRoot(rootDirectory, conversationId);
}

export function getMessageDirectory(rootDirectory: string, conversationId: string, message: ChatMessage): string {
  return resolvePathWithinRoot(
    rootDirectory,
    conversationId,
    `${sanitizeTimestamp(message.createdAt)}__${message.id}`,
  );
}
