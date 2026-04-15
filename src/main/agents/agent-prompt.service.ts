import { AgentContextFile, AgentId } from "../../shared/agent.types";

export function createDefaultAgentContext(agentId: AgentId): AgentContextFile {
  if (agentId === "device-agent") {
    return {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a preparer et executer des commandes locales. Tu dois verifier les permissions avant toute execution et journaliser clairement les actions techniques.",
      name: "Device",
    };
  }

  return {
    description: "Diagnostic et analyse d'etat pour le systeme Nova.",
    instructions:
      "Tu es l'agent Diagnostic de Nova. Tu aides a comprendre l'etat de l'application et des flux internes. Tu fournis des hypotheses et des pistes, sans executer de commande locale tant qu'aucun workflow dedie ne t'y autorise.",
    name: "Diagnostic",
  };
}
