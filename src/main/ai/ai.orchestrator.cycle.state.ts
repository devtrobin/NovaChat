import { ApiRequestRecord, ChatMessage } from "../../shared/chat.types";
import { AgentId } from "../../shared/agent.types";
import {
  createInterruptedCommandContextMessage,
  createPipelineSystemMessage,
  createThinkingSystemMessage,
  PipelineStage,
} from "./ai.orchestrator.cycle.messages";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";

export function restartAssistantThinking(
  conversationId: string,
  emit: Emit,
  previousSystemMessageId: string,
  stage: PipelineStage = "final-response",
  agentId?: AgentId,
): ChatMessage {
  emit({
    conversationId,
    messageId: previousSystemMessageId,
    type: "remove-message",
  });
  const nextSystemMessage = stage === "nova-thinking"
    ? createThinkingSystemMessage()
    : createPipelineSystemMessage(stage, agentId);
  emit({
    conversationId,
    messages: [nextSystemMessage],
    type: "append-messages",
  });
  return nextSystemMessage;
}

export function appendInterruptedCommandContext(turnMessages: ChatMessage[]): void {
  turnMessages.push(createInterruptedCommandContextMessage());
}

export function appendApiErrorTrace(
  userMessage: ChatMessage,
  apiRecords: ApiRequestRecord[],
  details: string,
): ChatMessage {
  userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...apiRecords];
  appendLifecycleLog(userMessage, "api-response-error", details);
  return { ...userMessage };
}
