import { ChatMessage } from "../../shared/chat.types";
import { AppSettings } from "../../shared/settings.types";
import { runAgentTask } from "../agents/agent-orchestrator.service";
import { createAgentRequestMessage, PipelineStage } from "./ai.orchestrator.cycle.messages";
import { ResolvedAgentHandoff } from "./ai.orchestrator.handoff";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";

type RunAgentHandoffArgs = {
  conversationId: string;
  emit: Emit;
  handoff: ResolvedAgentHandoff;
  onPipelineStageChange?: (stage: PipelineStage, agentId?: ResolvedAgentHandoff["agentId"]) => void;
  settings: AppSettings;
  turnId: string;
  turnMessages: ChatMessage[];
  userMessage: ChatMessage;
};

export async function runAgentHandoff({
  conversationId,
  emit,
  handoff,
  onPipelineStageChange,
  settings,
  turnId,
  turnMessages,
  userMessage,
}: RunAgentHandoffArgs): Promise<{ kind: "agent"; message: ChatMessage }> {
  const delegationMessage = createAgentRequestMessage(handoff.agentId, handoff.request, handoff.apiRecords);
  onPipelineStageChange?.("requesting-agent", handoff.agentId);
  emit({ conversationId, messages: [delegationMessage], type: "append-messages" });

  const { deviceMessage } = await runAgentTask({
    conversationId,
    emit,
    messageId: delegationMessage.id,
    onPipelineStageChange,
    settings,
    task: {
      agentId: handoff.agentId,
      mode: handoff.mode,
      request: handoff.request,
      turnId,
      triggerMessageId: userMessage.id,
      userAssistantConversationId: conversationId,
      userPrompt: userMessage.content,
    },
    turnId,
  });

  finalizeAgentCycleMessage(deviceMessage, delegationMessage, handoff.agentId);
  emit({ conversationId, messages: [deviceMessage], type: "append-messages" });
  turnMessages.push(deviceMessage);
  return { kind: "agent", message: deviceMessage };
}

export function finalizeAgentCycleMessage(
  message: ChatMessage,
  delegationMessage: ChatMessage,
  agentId: ResolvedAgentHandoff["agentId"],
): ChatMessage {
  message.apiRequests = [
    ...(delegationMessage.apiRequests ?? []),
    ...(message.apiRequests ?? []),
  ];
  appendLifecycleLog(message, "assistant-agent-cycle-complete", `Cycle assistant -> ${agentId} termine.`);
  return message;
}
