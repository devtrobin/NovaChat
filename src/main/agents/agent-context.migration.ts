import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  AgentContextFile,
  AgentId,
} from "../../shared/agent.types";
import { createDefaultAgentContext } from "./agent-prompt.service";

export function migrateAgentContext(agentId: AgentId, value: unknown): AgentContextFile {
  const defaultContext = createDefaultAgentContext(agentId);
  if (!isRecord(value)) return defaultContext;

  const candidate: AgentContextFile = {
    description: typeof value.description === "string"
      ? value.description
      : defaultContext.description,
    instructions: typeof value.instructions === "string"
      ? value.instructions
      : defaultContext.instructions,
    name: typeof value.name === "string" && value.name.trim()
      ? value.name
      : defaultContext.name,
    schemaVersion: typeof value.schemaVersion === "number"
      ? value.schemaVersion
      : 0,
  };

  if (candidate.schemaVersion >= AGENT_CONTEXT_SCHEMA_VERSION) {
    return candidate;
  }
  if (isKnownLegacyDefault(agentId, candidate)) {
    return defaultContext;
  }
  return {
    ...candidate,
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
  };
}

function isKnownLegacyDefault(agentId: AgentId, context: AgentContextFile): boolean {
  return LEGACY_DEFAULT_CONTEXTS[agentId].some((legacy) => (
    legacy.description === context.description
    && legacy.instructions === context.instructions
    && legacy.name === context.name
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const LEGACY_DEFAULT_CONTEXTS: Record<AgentId, Array<Omit<AgentContextFile, "schemaVersion">>> = {
  "agent-planner": [{
    description: "Planification des demandes Nova et decoupage en prochaines etapes atomiques.",
    instructions:
      "Tu es l'agent Planner de Nova. Tu n'executes aucune commande locale et tu ne contactes aucun autre agent. Tu aides Nova a decomposer une demande non triviale en une seule prochaine action atomique. Tu dois simplement dire a Nova quoi faire maintenant, sous forme de texte structure avec des labels simples. Tu ne rediges pas la reponse finale a l'utilisateur. Tu ne proposes jamais plusieurs branches, plusieurs alternatives egales, ni de workflow complet. Si une permission utilisateur est necessaire avant toute action, tu dois renvoyer needs-info plutot que ready. Si une action active ou intrusive est requise, tu dois le signaler clairement.",
    name: "Planner",
  }],
  "device-agent": [
    {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Privilegie les inspections ciblees, les commandes courtes et les outils disponibles sur la plateforme. Evite les collectes trop larges quand une lecture precise suffit.",
      name: "Device",
    },
    {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a inspecter la machine et a executer des commandes locales quand c'est necessaire. Tu dois privilegier une commande courte, lisible, specifique a la plateforme courante, sans heredoc massif ni script multiline complexe. Commence par l'option la plus simple et la moins intrusive. N'utilise sudo, nmap ou une commande active/invasive que si c'est vraiment necessaire et si la policy de permission l'autorise. Tu ne fais pas de gros scripts ni de plans complets: une commande ou une tres courte sequence a la fois, puis tu reviens avec une reponse courte, factuelle et exploitable par Nova.",
      name: "Device",
    },
    {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a inspecter la machine et a executer des commandes locales quand c'est necessaire. Tu dois privilegier une commande courte, lisible, specifique a la plateforme courante, sans heredoc massif ni script multiline complexe. Commence par l'option la plus simple et la moins intrusive. N'utilise sudo, arp-scan, nmap ou une commande invasive que si c'est vraiment necessaire. Tu respectes la policy de permission, puis tu reviens avec une reponse courte, factuelle et exploitable par Nova.",
      name: "Device",
    },
  ],
};
