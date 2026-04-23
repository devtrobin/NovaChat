import { AIProviderId } from "../../shared/settings.types";
import { AgentContextFile, AgentId } from "../../shared/agent.types";

export type AgentRuntimeContext = {
  activeProvider: AIProviderId;
  platform: NodeJS.Platform;
  shell: string;
};

export function createDefaultAgentContext(agentId: AgentId): AgentContextFile {
  if (agentId === "device-agent") {
    return {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a inspecter la machine et a executer des commandes locales quand c'est necessaire. Tu dois privilegier une commande courte, lisible, specifique a la plateforme courante, sans heredoc massif ni script multiline complexe. Commence par l'option la plus simple et la moins intrusive. N'utilise sudo, arp-scan, nmap ou une commande invasive que si c'est vraiment necessaire. Tu respectes la policy de permission, puis tu reviens avec une reponse courte, factuelle et exploitable par Nova.",
      name: "Device",
    };
  }

  return {
    description: "Analyse, triage et interpretation pour le systeme Nova.",
    instructions:
      "Tu es l'agent Diagnostic de Nova. Tu n'executes pas de commande locale. Tu aides Nova a comprendre un probleme, interpreter un resultat, proposer des hypotheses, prioriser une investigation et recommander la prochaine action utile. Tu ne rediges pas la reponse finale a l'utilisateur, tu aides l'assistant principal a la preparer.",
    name: "Diagnostic",
  };
}

export function createAgentRuntimeContext(activeProvider: AIProviderId): AgentRuntimeContext {
  return {
    activeProvider,
    platform: process.platform,
    shell: process.env.SHELL ?? "unknown",
  };
}
