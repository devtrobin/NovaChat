import {
  ConversationIndicator,
  SettingsCategory,
} from "./workspace.types";
import {
  getConversationUnreadCount,
  hasConversationRunningSystemMessage,
} from "../chat/chat.service";
import { Conversation } from "../../types/chat.types";
import { AgentSettingsMap } from "../../../shared/settings.types";

export const AGENTS = [
  {
    capabilities: [
      "shell-execution",
      "interactive-input",
      "permission-checking",
      "execution-history",
    ],
    context: "Agent specialise dans l'execution locale, l'analyse machine et les interactions terminales.",
    description: "Execution des commandes et interactions device.",
    features: [
      "execution de commandes",
      "saisie interactive",
      "journalisation locale",
      "diagnostic terminal",
    ],
    id: "device-agent",
    mission: "Executer des commandes locales, verifier les permissions et remonter un resultat exploitable a l'assistant principal.",
    name: "Device",
    processes: [
      "prepare une action terminale",
      "execute la commande sur le device",
      "collecte la sortie et les erreurs",
      "remonte un resultat exploitable",
    ],
    tools: [
      "device.run",
      "device.kill",
      "device.input",
    ],
  },
  {
    capabilities: [
      "diagnostic-reasoning",
      "state-analysis",
      "workflow-observation",
    ],
    context: "Agent specialise dans le diagnostic des etats internes et des workflows Nova.",
    description: "Analyse des etats et support au diagnostic produit.",
    features: [
      "analyse des workflows",
      "lecture de contexte agent",
      "preparation de diagnostics",
    ],
    id: "diagnostic-agent",
    mission: "Aider a comprendre l'etat de Nova et preparer des diagnostics sans execution shell automatique.",
    name: "Diagnostic",
    processes: [
      "observe l'etat courant",
      "formule des hypotheses",
      "structure des pistes d'investigation",
    ],
    tools: [
      "agent.context",
      "agent.history",
    ],
  },
] as const;

export function buildAgentDefinitions(agentSettings: AgentSettingsMap) {
  return AGENTS.map((agent) => ({
    ...agent,
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
