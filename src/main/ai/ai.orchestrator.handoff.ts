import { ApiRequestRecord } from "../../shared/chat.types";
import { AgentId, AgentTaskRequest } from "../../shared/agent.types";
import { isLikelyShellCommand } from "./ai.command-detection";
import { ProviderResponse } from "./openai.types";

export type ResolvedAgentHandoff = {
  agentId: AgentId;
  apiRecords: ApiRequestRecord[];
  mode: AgentTaskRequest["mode"];
  previewContent: string;
  request: string;
};

export function resolveAgentHandoff(args: {
  apiRecords: ApiRequestRecord[];
  providerResponse: Exclude<ProviderResponse, { to: "user" }>;
}): ResolvedAgentHandoff {
  const agentId = args.providerResponse.to === "agent"
    ? args.providerResponse.agentId
    : "device-agent";
  const content = args.providerResponse.content;
  const goal = agentId === "device-agent"
    ? extractDeviceGoal(content) ?? (!isLikelyShellCommand(content) ? content.trim() : null)
    : null;

  if (!goal) {
    return {
      agentId,
      apiRecords: args.apiRecords,
      mode: agentId === "device-agent" ? "command" : "analysis",
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

function extractDeviceGoal(value: string): string | null {
  const match = value.trim().match(/^(?:goal|objective|task)\s*:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() ? match[1].trim() : null;
}
