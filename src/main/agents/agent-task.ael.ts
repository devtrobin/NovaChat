import { ChatMessage } from "../../shared/chat.types";
import { recordAgentCommandExchange } from "./agent-storage.service";
import { resolveAELAgentCommand } from "./agent-task.ael-command";
import { resolveAELPermission } from "./agent-task.ael-permission";
import {
  createAELAgentSummaryMessage,
  extractAELAgentSummaryOutput,
  normalizeAELStatus,
} from "./agent-task.messages";
import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";
import { executeAELCommand } from "../ai/ai.ael-flow";
import { createAELImmediateErrorMessage } from "../ai/ai.message-factory";
import { createRunningAELMessage } from "../ai/ai.message-factory.ael";
import {
  setAgentConversationId,
  throwIfTurnStopped,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";
import { evaluateAELAgentCommandProfile } from "../ael/ael.agent-command-profile";
import { runAELFileWriteTask } from "./agent-task.ael-file";

export async function runAELAgentTask(
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
  const {
    apiRecords: commandApiRecords,
    command: resolvedCommand,
    fileOperation,
  } = await resolveAELAgentCommand(settings, task);
  throwIfTurnStopped(turnId);
  if (fileOperation) return runAELFileWriteTask(args, activeTaskId, currentAgentConversationId, fileOperation, commandApiRecords);

  const profileDecision = evaluateAELAgentCommandProfile(resolvedCommand);
  if (profileDecision.kind === "reject") {
    const rejectedMessage = createAELAgentSummaryMessage(
      task.request,
      resolvedCommand,
      profileDecision.reason,
      "error",
    );
    rejectedMessage.apiRequests = [...commandApiRecords];
    return persistAELAgentResult(
      args,
      currentAgentConversationId,
      resolvedCommand,
      commandApiRecords,
      rejectedMessage,
    );
  }

  const permissionResult = await resolveAELPermission(
    args,
    activeTaskId,
    currentAgentConversationId,
    resolvedCommand,
    commandApiRecords,
  );
  if (permissionResult) return permissionResult;

  const aelMessage = await executeResolvedAELCommand(
    args,
    activeTaskId,
    resolvedCommand,
    commandApiRecords,
  );
  return persistAELAgentResult(
    args,
    currentAgentConversationId,
    resolvedCommand,
    commandApiRecords,
    aelMessage,
  );
}

async function persistAELAgentResult(
  args: RunAgentTaskArgs,
  currentAgentConversationId: string | null,
  resolvedCommand: string,
  commandApiRecords: NonNullable<ChatMessage["apiRequests"]>,
  aelMessage: ChatMessage,
): Promise<AgentTaskExecutionResult> {
  const {
    settings,
    task,
    turnId,
  } = args;
  const record = await recordAgentCommandExchange({
    agentId: task.agentId,
    agentConversationId: currentAgentConversationId,
    apiTraceSettings: settings.apiTrace,
    apiRequests: commandApiRecords,
    assistantRequest: task.request,
    command: resolvedCommand,
    result: {
      output: extractAELAgentSummaryOutput(aelMessage),
      status: normalizeAELStatus(aelMessage.status),
    },
    rootDirectory: settings.localFiles.agentsDirectory,
    triggerMessageId: task.triggerMessageId,
    userAssistantConversationId: task.userAssistantConversationId,
    userPrompt: task.userPrompt,
  });
  setAgentConversationId(turnId, task.agentId, record.agentConversationId);

  return {
    aelMessage,
    result: {
      agentConversationId: record.agentConversationId,
      kind: "completed",
      output: extractAELAgentSummaryOutput(aelMessage),
      request: task.request,
      resolvedCommand,
      status: normalizeAELStatus(aelMessage.status),
    },
  };
}

async function executeResolvedAELCommand(
  args: RunAgentTaskArgs,
  activeTaskId: string,
  resolvedCommand: string,
  commandApiRecords: NonNullable<ChatMessage["apiRequests"]>,
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
    const runningMessage = createRunningAELMessage(
      resolvedCommand,
      crypto.randomUUID(),
      "assistant",
      "ael",
    );
    onPipelineStageChange?.("executing-command", task.agentId);
    emit({ conversationId, messages: [runningMessage], type: "append-messages" });
    const executionMessage = await executeAELCommand({
      command: resolvedCommand,
      conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      onProgressStateChange: (status) => updateActiveAgentTaskStatus(activeTaskId, status),
      options: args.settings.aelExecution,
      resultRecipient: "assistant",
      resultSender: "ael",
      turnId,
    });
    const summaryMessage = createAELAgentSummaryMessage(
      task.request,
      resolvedCommand,
      executionMessage.result ?? "",
      normalizeAELStatus(executionMessage.status),
    );
    summaryMessage.apiRequests = [...commandApiRecords];
    return summaryMessage;
  } catch (error) {
    const aelErrorMessage = createAELImmediateErrorMessage(
      resolvedCommand,
      messageId,
      error,
      "assistant",
    );
    const summaryMessage = createAELAgentSummaryMessage(
      task.request,
      resolvedCommand,
      aelErrorMessage.result ?? "",
      "error",
    );
    summaryMessage.apiRequests = [...commandApiRecords];
    return summaryMessage;
  }
}
