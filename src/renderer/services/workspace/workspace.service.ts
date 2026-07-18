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
      "task-planning",
      "atomic-step-design",
      "agent-routing",
    ],
    context: "Agent specialise dans la planification des demandes Nova et le decoupage en actions atomiques.",
    description: "Planification, routage agent et prochaine etape atomique.",
    features: [
      "decoupage des demandes",
      "selection d'agent recommande",
      "resume JSON et debug",
    ],
    id: "agent-planner",
    mission: "Transformer une demande non triviale en prochaine action atomique pour Nova, sans executer lui-meme les actions.",
    name: "Planner",
    processes: [
      "analyse la demande courante",
      "identifie les informations manquantes",
      "propose une prochaine action atomique",
      "recommande l'agent a appeler",
    ],
    tools: [
      "agent.context",
      "planner.next-step",
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
