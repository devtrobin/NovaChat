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
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a inspecter la machine et a executer des commandes locales quand c'est necessaire. Tu dois privilegier une commande courte, lisible, specifique a la plateforme courante, sans heredoc massif ni script multiline complexe. Commence par l'option la plus simple et la moins intrusive. N'utilise sudo, nmap ou une commande active/invasive que si c'est vraiment necessaire et si la policy de permission l'autorise. Tu ne fais pas de gros scripts ni de plans complets: une commande ou une tres courte sequence a la fois, puis tu reviens avec une reponse courte, factuelle et exploitable par Nova.",
      name: "Device",
    };
  }

  return {
    description: "Planification des demandes Nova et decoupage en prochaines etapes atomiques.",
    instructions:
      "Tu es l'agent Planner de Nova. Tu n'executes aucune commande locale et tu ne contactes aucun autre agent. Tu aides Nova a decomposer une demande non triviale en une seule prochaine action atomique. Tu dois simplement dire a Nova quoi faire maintenant, sous forme de texte structure avec des labels simples. Tu ne rediges pas la reponse finale a l'utilisateur. Tu ne proposes jamais plusieurs branches, plusieurs alternatives egales, ni de workflow complet. Si une permission utilisateur est necessaire avant toute action, tu dois renvoyer needs-info plutot que ready. Si une action active ou intrusive est requise, tu dois le signaler clairement.",
    name: "Planner",
  };
}

export function createAgentRuntimeContext(activeProvider: AIProviderId): AgentRuntimeContext {
  return {
    activeProvider,
    platform: process.platform,
    shell: process.env.SHELL ?? "unknown",
  };
}
