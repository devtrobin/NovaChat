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
  {
    context: "Agent specialise dans l'execution locale, l'analyse machine et les interactions terminales.",
    description: "Execution des commandes et interactions device.",
    features: [
      "execution de commandes",
      "saisie interactive",
      "journalisation locale",
      "diagnostic terminal",
    ],
    id: "device-agent",
    name: "Device",
    processes: [
      "prepare une action terminale",
      "execute la commande sur le device",
      "collecte la sortie et les erreurs",
      "remonte un resultat exploitable",
    ],
  },
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
