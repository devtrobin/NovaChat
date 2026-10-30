import { ApiRequestRecord } from "../../shared/chat.types";
import { AgentId, AgentTaskAction } from "../../shared/agent.types";
import { isLikelyShellCommand } from "./ai.command-detection";
import { ProviderResponse } from "./openai.types";

export type ResolvedAgentHandoff = {
  agentId: AgentId;
  apiRecords: ApiRequestRecord[];
  previewContent: string;
  request: string;
} & AgentTaskAction;

export function resolveAgentHandoff(args: {
  apiRecords: ApiRequestRecord[];
  providerResponse: Exclude<ProviderResponse, { to: "user" }>;
}): ResolvedAgentHandoff {
  if ("action" in args.providerResponse && args.providerResponse.action === "write-file") {
    const { action, target, content, overwrite } = args.providerResponse;
    const request = `Creer ${target.name} dans ${target.directory === "desktop" ? "le Bureau" : "le dossier de travail"}.`;
    return {
      agentId: "agent-ael", apiRecords: args.apiRecords, mode: "write-file",
      fileOperation: { action, target, content, overwrite }, previewContent: request, request,
    };
  }
  const agentId = args.providerResponse.to === "agent"
    ? args.providerResponse.agentId
    : "agent-ael";
  const content = args.providerResponse.content;
  const goal = agentId === "agent-ael"
    ? extractAELGoal(content) ?? (!isLikelyShellCommand(content) ? content.trim() : null)
    : null;

  if (!goal) {
    return {
      agentId,
      apiRecords: args.apiRecords,
      mode: agentId === "agent-ael" ? "command" : "analysis",
      previewContent: content,
      request: content,
    };
  }

  return {
    agentId,
    apiRecords: args.apiRecords,
    mode: "goal",
    previewContent: `GOAL: ${goal}`,
    request: goal,
  };
}

function extractAELGoal(value: string): string | null {
  const match = value.trim().match(/^(?:goal|objective|task)\s*:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() ? match[1].trim() : null;
}
