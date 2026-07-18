import { ApiRequestRecord, ChatMessage } from "../../shared/chat.types";
import { AgentId } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import { ResolvedAgentHandoff } from "./ai.orchestrator.handoff";

export function shouldForcePlannerAgentHandoff(
  settings: AppSettings,
  step: number,
  turnMessages: ChatMessage[],
  userPrompt: string,
  assistantReply: string,
): boolean {
  if (step > 0 || !isAgentEnabled(settings, "agent-planner")) {
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
  if (turnMessages.some((message) => message.from === "device" || message.agentId === "device-agent")) {
    return false;
  }
  if (turnMessages.some((message) => message.from === "agent" && message.agentId === "agent-planner")) {
    return false;
  }

  const replyAlreadyMentionsPlanner = normalizedReply.includes("agent-planner")
    || normalizedReply.includes("planner");
  return !replyAlreadyMentionsPlanner;
}

export function createForcedPlannerHandoff(
  apiRecords: ApiRequestRecord[],
  userPrompt: string,
): ResolvedAgentHandoff {
  return {
    agentId: "agent-planner",
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
  return (Object.entries(settings.agents) as Array<[AgentId, { enabled: boolean }]>)
    .filter(([, state]) => state.enabled)
    .map(([agentId]) => agentId);
}

export function formatAgentLabel(agentId: AgentId): string {
  return agentId === "device-agent" ? "Device" : "Planner";
}
