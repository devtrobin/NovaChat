import {
  ConversationIndicator,
  SettingsCategory,
} from "./workspace.types";
import {
  getConversationUnreadCount,
  hasConversationRunningSystemMessage,
} from "../chat/chat.service";
import { Conversation } from "../../../shared/chat.types";
import { AgentSettingsMap } from "../../../shared/settings.types";
import { SYSTEM_AGENT_DEFINITIONS } from "../../../shared/system-agent.registry";

export const AGENTS = Object.values(SYSTEM_AGENT_DEFINITIONS);

export function buildAgentDefinitions(agentSettings: AgentSettingsMap) {
  return AGENTS.map((agent) => ({
    ...agent,
    name: agent.acronym,
    enabled: agentSettings[agent.id]?.enabled ?? true,
  }));
}

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
