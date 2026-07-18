import { ChatMessage } from "../../renderer/types/chat.types";
import { recordAgentCommandExchange } from "./agent-storage.service";
import { resolveDeviceAgentCommand } from "./agent-task.device-command";
import { resolveDevicePermission } from "./agent-task.device-permission";
import {
  createDeviceAgentSummaryMessage,
  extractDeviceAgentSummaryOutput,
  normalizeDeviceStatus,
} from "./agent-task.messages";
import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";
import { executeDeviceCommand } from "../ai/ai.device-flow";
import { createDeviceImmediateErrorMessage } from "../ai/ai.message-factory";
import { createRunningDeviceMessage } from "../ai/ai.message-factory.device";
import {
  setAgentConversationId,
  throwIfTurnStopped,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";

export async function runDeviceAgentTask(
  args: RunAgentTaskArgs,
  activeTaskId: string,
  currentAgentConversationId: string | null,
): Promise<AgentTaskExecutionResult> {
  const {
    onPipelineStageChange,
    settings,
    task,
    turnId,
  } = args;

  onPipelineStageChange?.("agent-generating", task.agentId);
  const resolvedCommand = await resolveDeviceAgentCommand(settings, task);
  throwIfTurnStopped(turnId);

  const permissionResult = await resolveDevicePermission(
    args,
    activeTaskId,
    currentAgentConversationId,
    resolvedCommand,
  );
  if (permissionResult) return permissionResult;

  const deviceMessage = await executeResolvedDeviceCommand(
    args,
    activeTaskId,
    resolvedCommand,
  );
  const record = await recordAgentCommandExchange({
    agentId: task.agentId,
    agentConversationId: currentAgentConversationId,
    assistantRequest: task.request,
    command: resolvedCommand,
    result: {
      output: extractDeviceAgentSummaryOutput(deviceMessage),
      status: normalizeDeviceStatus(deviceMessage.status),
    },
    rootDirectory: settings.localFiles.agentsDirectory,
    triggerMessageId: task.triggerMessageId,
    userAssistantConversationId: task.userAssistantConversationId,
    userPrompt: task.userPrompt,
  });
  setAgentConversationId(turnId, task.agentId, record.agentConversationId);

  return {
    deviceMessage,
    result: {
      agentConversationId: record.agentConversationId,
      kind: "completed",
      output: extractDeviceAgentSummaryOutput(deviceMessage),
      request: task.request,
      resolvedCommand,
      status: normalizeDeviceStatus(deviceMessage.status),
    },
  };
}

async function executeResolvedDeviceCommand(
  args: RunAgentTaskArgs,
  activeTaskId: string,
  resolvedCommand: string,
): Promise<ChatMessage> {
  const {
    conversationId,
    emit,
    messageId,
    onPipelineStageChange,
    task,
    turnId,
  } = args;

  try {
    const runningMessage = createRunningDeviceMessage(
      resolvedCommand,
      crypto.randomUUID(),
      "assistant",
      "device",
    );
    onPipelineStageChange?.("executing-command", task.agentId);
    emit({ conversationId, messages: [runningMessage], type: "append-messages" });
    const executionMessage = await executeDeviceCommand({
      command: resolvedCommand,
      conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      onProgressStateChange: (status) => updateActiveAgentTaskStatus(activeTaskId, status),
      resultRecipient: "assistant",
      resultSender: "device",
      turnId,
    });
    return createDeviceAgentSummaryMessage(
      task.request,
      resolvedCommand,
      executionMessage.result ?? "",
      normalizeDeviceStatus(executionMessage.status),
    );
  } catch (error) {
    const deviceErrorMessage = createDeviceImmediateErrorMessage(
      resolvedCommand,
      messageId,
      error,
      "assistant",
    );
    return createDeviceAgentSummaryMessage(
      task.request,
      resolvedCommand,
      deviceErrorMessage.result ?? "",
      "error",
    );
  }
}
