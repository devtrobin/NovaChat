import { ActiveAIProviderId } from "../../shared/settings.types";
import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  AgentContextFile,
  AgentId,
} from "../../shared/agent.types";
import { getSystemAgentDefinition } from "../../shared/system-agent.registry";
import { getAELRuntimeShell } from "../ael/ael.shell";

export type AgentRuntimeContext = {
  activeProvider: ActiveAIProviderId;
  platform: NodeJS.Platform;
  shell: string;
  shellFamily: "cmd" | "posix";
};

export function createDefaultAgentContext(agentId: AgentId): AgentContextFile {
  const definition = getSystemAgentDefinition(agentId);
  return {
    ...definition.defaultContext,
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
  };
}

export function createAgentRuntimeContext(activeProvider: ActiveAIProviderId): AgentRuntimeContext {
  const runtimeShell = getAELRuntimeShell();
  return {
    activeProvider,
    platform: process.platform,
    shell: runtimeShell.name,
    shellFamily: runtimeShell.family,
  };
}
