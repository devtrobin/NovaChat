import {
  getAgentPermission,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "./agent-storage.service";
import { ApiRequestRecord } from "../../shared/chat.types";
import { createAELAgentSummaryMessage } from "./agent-task.messages";
import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";
import { createAELImmediateErrorMessage } from "../ai/ai.message-factory";
import { requestAELPermission } from "../ai/ai.permission.service";
import {
  AEL_RISK_CATEGORY_LABELS,
  AELCommandRiskCategory,
  evaluateCommandPermissionPolicy,
} from "../ael/ael.policy";
import {
  setAgentConversationId,
  TurnStoppedError,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";
import { getAELAgentAllowedWriteRoots } from "./agent-task.ael-command";

export async function resolveAELPermission(
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
    getAELAgentAllowedWriteRoots(settings),
  );

  if (policyDecision.kind === "allow") {
    return null;
  }

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

  if (permissionLookup.decision === "allow") {
    return null;
  }

  updateActiveAgentTaskStatus(activeTaskId, "waiting-permission");
  onPipelineStageChange?.("waiting-permission", task.agentId);
  const { decision } = await requestAELPermission(
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
  const aelErrorMessage = createAELImmediateErrorMessage(
    resolvedCommand,
    messageId,
    new Error(errorMessage),
    "assistant",
  );
  const aelMessage = createAELAgentSummaryMessage(
    task.request,
    resolvedCommand,
    aelErrorMessage.result ?? "",
    "denied",
  );
  aelMessage.apiRequests = [...commandApiRecords];
  const record = await recordAgentCommandExchange({
    agentId: task.agentId,
    agentConversationId: currentAgentConversationId,
    apiTraceSettings: settings.apiTrace,
    apiRequests: commandApiRecords,
    assistantRequest: task.request,
    command: resolvedCommand,
    result: {
      output: aelErrorMessage.result ?? "",
      status: "denied",
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
      kind: "permission-denied",
      output: aelErrorMessage.result ?? "",
      request: task.request,
      resolvedCommand,
    },
  };
}

function summarizePermissionRequest(
  taskRequest: string,
  command: string,
  category: AELCommandRiskCategory,
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
    `Catégorie : ${AEL_RISK_CATEGORY_LABELS[category]}`,
    requestSummary,
    `Commande : ${firstCommandLine.slice(0, 140)}`,
  ].join(" | ");
}
