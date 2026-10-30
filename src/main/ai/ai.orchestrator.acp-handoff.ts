import { ApiRequestRecord, ChatMessage } from "../../shared/chat.types";
import { AgentId } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import {
  getSystemAgentDefinition,
  SYSTEM_AGENT_IDS,
} from "../../shared/system-agent.registry";
import { ResolvedAgentHandoff } from "./ai.orchestrator.handoff";

export function shouldForceACPAgentHandoff(
  settings: AppSettings,
  step: number,
  turnMessages: ChatMessage[],
  userPrompt: string,
  assistantReply: string,
): boolean {
  if (step > 0 || !isAgentEnabled(settings, "agent-acp")) {
    return false;
  }

  const normalizedPrompt = userPrompt.trim().toLowerCase();
  const normalizedReply = assistantReply.trim().toLowerCase();
  const planningSignals = [
    "analyse",
    "analyser",
    "corrige",
    "debug",
    "debugging",
    "diagnostic",
    "echec",
    "enquete",
    "erreur",
    "investigation",
    "plan",
    "piste",
    "probleme",
    "refactor",
    "workflow",
  ];
  const promptLooksNonTrivial = normalizedPrompt.length > 140
    || planningSignals.some((signal) => normalizedPrompt.includes(signal));

  if (!promptLooksNonTrivial) return false;
  if (turnMessages.some((message) => message.from === "ael" || message.agentId === "agent-ael")) {
    return false;
  }
  if (turnMessages.some((message) => message.from === "agent" && message.agentId === "agent-acp")) {
    return false;
  }

  const replyAlreadyMentionsACP = normalizedReply.includes("agent-acp")
    || normalizedReply.includes("acp");
  return !replyAlreadyMentionsACP;
}

export function createForcedACPHandoff(
  apiRecords: ApiRequestRecord[],
  userPrompt: string,
): ResolvedAgentHandoff {
  return {
    agentId: "agent-acp",
    apiRecords,
    mode: "analysis",
    previewContent: userPrompt,
    request: `Propose la prochaine etape atomique pour traiter cette demande utilisateur: ${userPrompt}`,
  };
}

export function isAgentEnabled(settings: AppSettings, agentId: AgentId): boolean {
  return settings.agents[agentId]?.enabled ?? true;
}

export function getEnabledAgents(settings: AppSettings): AgentId[] {
  return SYSTEM_AGENT_IDS.filter((agentId) => settings.agents[agentId].enabled);
}

export function formatAgentLabel(agentId: AgentId): string {
  return getSystemAgentDefinition(agentId).acronym;
}
