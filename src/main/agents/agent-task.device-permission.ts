import {
  getAgentPermission,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "./agent-storage.service";
import { ApiRequestRecord } from "../../shared/chat.types";
import { createDeviceAgentSummaryMessage } from "./agent-task.messages";
import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";
import { createDeviceImmediateErrorMessage } from "../ai/ai.message-factory";
import { requestDevicePermission } from "../ai/ai.permission.service";
import {
  DEVICE_RISK_CATEGORY_LABELS,
  DeviceCommandRiskCategory,
  evaluateCommandPermissionPolicy,
} from "../device/device.policy";
import {
  setAgentConversationId,
  TurnStoppedError,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";
import { getDeviceAgentAllowedWriteRoots } from "./agent-task.device-command";

export async function resolveDevicePermission(
  args: RunAgentTaskArgs,
  activeTaskId: string,
  currentAgentConversationId: string | null,
  resolvedCommand: string,
  commandApiRecords: ApiRequestRecord[],
): Promise<AgentTaskExecutionResult | null> {
  const {
    conversationId,
    emit,
    onPipelineStageChange,
    settings,
    task,
    turnId,
  } = args;
  const policyDecision = evaluateCommandPermissionPolicy(
    resolvedCommand,
    getDeviceAgentAllowedWriteRoots(settings),
  );
  const permissionLookup = policyDecision.kind === "ask"
    ? await getAgentPermission(
      settings.localFiles.agentsDirectory,
      task.agentId,
      resolvedCommand,
    )
    : { decision: null, matchedRule: null };

  if (permissionLookup.decision === "deny") {
    return recordPermissionDenied(
      args,
      currentAgentConversationId,
      resolvedCommand,
      commandApiRecords,
      "Commande refusee par une permission enregistree.",
    );
  }

  if (policyDecision.kind !== "ask-always" && permissionLookup.decision !== null) {
    return null;
  }

  updateActiveAgentTaskStatus(activeTaskId, "waiting-permission");
  onPipelineStageChange?.("waiting-permission", task.agentId);
  const { decision } = await requestDevicePermission(
    conversationId,
    resolvedCommand,
    emit,
    turnId,
    summarizePermissionRequest(task.request, resolvedCommand, policyDecision.category),
  );
  updateActiveAgentTaskStatus(activeTaskId, "running");

  if (decision === "cancel") {
    throw new TurnStoppedError();
  }

  if (decision === "allow-always" && policyDecision.kind === "ask") {
    await saveAgentPermission(
      settings.localFiles.agentsDirectory,
      task.agentId,
      resolvedCommand,
      "allow",
      true,
    );
  }

  if (decision !== "deny" && decision !== "deny-always") {
    return null;
  }

  if (decision === "deny-always" && policyDecision.kind === "ask") {
    await saveAgentPermission(
      settings.localFiles.agentsDirectory,
      task.agentId,
      resolvedCommand,
      "deny",
      true,
    );
  }
  return recordPermissionDenied(
    args,
    currentAgentConversationId,
    resolvedCommand,
    commandApiRecords,
    "Commande refusee par l'utilisateur.",
  );
}

async function recordPermissionDenied(
  args: RunAgentTaskArgs,
  currentAgentConversationId: string | null,
  resolvedCommand: string,
  commandApiRecords: ApiRequestRecord[],
  errorMessage: string,
): Promise<AgentTaskExecutionResult> {
  const {
    messageId,
    settings,
    task,
    turnId,
  } = args;
  const deviceErrorMessage = createDeviceImmediateErrorMessage(
    resolvedCommand,
    messageId,
    new Error(errorMessage),
    "assistant",
  );
  const deviceMessage = createDeviceAgentSummaryMessage(
    task.request,
    resolvedCommand,
    deviceErrorMessage.result ?? "",
    "denied",
  );
  deviceMessage.apiRequests = [...commandApiRecords];
  const record = await recordAgentCommandExchange({
    agentId: task.agentId,
    agentConversationId: currentAgentConversationId,
    apiRequests: commandApiRecords,
    assistantRequest: task.request,
    command: resolvedCommand,
    result: {
      output: deviceErrorMessage.result ?? "",
      status: "denied",
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
      kind: "permission-denied",
      output: deviceErrorMessage.result ?? "",
      request: task.request,
      resolvedCommand,
    },
  };
}

function summarizePermissionRequest(
  taskRequest: string,
  command: string,
  category: DeviceCommandRiskCategory,
): string {
  const requestSummary = taskRequest
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const firstCommandLine = command
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? command.trim();

  return [
    `Catégorie : ${DEVICE_RISK_CATEGORY_LABELS[category]}`,
    requestSummary,
    `Commande : ${firstCommandLine.slice(0, 140)}`,
  ].join(" | ");
}
