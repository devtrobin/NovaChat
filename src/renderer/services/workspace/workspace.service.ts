import {
  ConversationIndicator,
  SettingsCategory,
} from "./workspace.types";
import {
  getConversationUnreadCount,
  hasConversationRunningSystemMessage,
} from "../chat/chat.service";
import { Conversation } from "../../types/chat.types";

export const AGENTS = [
  { description: "Pilotage global de la conversation Nova.", id: "main-agent", name: "Assistant principal" },
  { description: "Execution des commandes et interactions device.", id: "device-agent", name: "Device" },
] as const;

export const PREVIEW_PROVIDER_CATEGORIES: SettingsCategory[] = [
  "anthropic",
  "google",
  "mistral",
  "ollama",
  "lmstudio",
];

export function isProviderCategory(category: SettingsCategory): boolean {
  return ["provider", "openai", ...PREVIEW_PROVIDER_CATEGORIES].includes(category);
}

export function createConversationIndicators(
  conversations: Conversation[],
): Record<string, ConversationIndicator> {
  return Object.fromEntries(
    conversations.map((conversation) => [
      conversation.id,
      {
        hasRunningSystemMessage: hasConversationRunningSystemMessage(conversation),
        unreadCount: getConversationUnreadCount(conversation),
      },
    ]),
  );
}
