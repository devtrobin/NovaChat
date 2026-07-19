import { ActiveAIProviderId } from "../../shared/settings.types";
import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  AgentContextFile,
  AgentId,
} from "../../shared/agent.types";
import { getDeviceRuntimeShell } from "../device/device.shell";

export type AgentRuntimeContext = {
  activeProvider: ActiveAIProviderId;
  platform: NodeJS.Platform;
  shell: string;
  shellFamily: "cmd" | "posix";
};

export function createDefaultAgentContext(agentId: AgentId): AgentContextFile {
  if (agentId === "device-agent") {
    return {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Utilise uniquement des commandes terminal natives, courtes et non interactives. N'ouvre jamais de fenetre, de console secondaire ni d'utilitaire interactif. Retourne a Nova apres chaque inspection ciblee.",
      name: "Device",
      schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    };
  }

  return {
    description: "Planification des demandes Nova et decoupage en prochaines etapes atomiques.",
    instructions:
      "Decompose la demande en une prochaine action atomique, tiens compte des resultats deja obtenus et indique clairement le critere de reussite. Signale les actions actives ou intrusives sans inventer de demande de permission.",
    name: "Planner",
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
  };
}

export function createAgentRuntimeContext(activeProvider: ActiveAIProviderId): AgentRuntimeContext {
  const runtimeShell = getDeviceRuntimeShell();
  return {
    activeProvider,
    platform: process.platform,
    shell: runtimeShell.name,
    shellFamily: runtimeShell.family,
  };
}
