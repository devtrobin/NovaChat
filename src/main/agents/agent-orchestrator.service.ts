import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentId, AgentTaskRequest, AgentTaskResult } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import {
  appendDirectAgentExchange,
  createAgentUserConversation,
  getAgentPermission,
  loadAgentWorkspace,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "./agent-storage.service";
import { createAgentRuntimeContext } from "./agent-prompt.service";
import { Emit } from "../ai/ai.orchestrator.types";
import { generateAgentTextReply, generateDeviceAgentCommand } from "../ai/openai.service";
import { requestDevicePermission } from "../ai/ai.permission.service";
import { executeDeviceCommand } from "../ai/ai.device-flow";
import { createDeviceImmediateErrorMessage } from "../ai/ai.message-factory";
import { createRunningDeviceMessage } from "../ai/ai.message-factory.device";
import type { PipelineStage } from "../ai/ai.orchestrator.cycle.messages";
import { evaluateCommandPermissionPolicy } from "../device/device.policy";
import {
  completeActiveAgentTask,
  getAgentConversationId,
  finishTurn,
  registerAbortController,
  registerActiveAgentTask,
  startTurn,
  setAgentConversationId,
  TurnStoppedError,
  throwIfTurnStopped,
  unregisterAbortController,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";

type RunAgentTaskArgs = {
  conversationId: string;
  emit: Emit;
  messageId: string;
  onPipelineStageChange?: (stage: PipelineStage, agentId?: AgentId) => void;
  settings: AppSettings;
  task: AgentTaskRequest;
  turnId: string;
};

export async function runAgentTask({
  conversationId,
  emit,
  messageId,
  onPipelineStageChange,
  settings,
  task,
  turnId,
}: RunAgentTaskArgs): Promise<{ deviceMessage: ChatMessage; result: AgentTaskResult }> {
  const currentAgentConversationId = await resolveAgentConversationId(settings, task, turnId);
  if (!settings.agents[task.agentId]?.enabled) {
    const deviceMessage = createAgentResultMessage(
      task.agentId,
      `L'agent ${task.agentId} est actuellement desactive.`,
    );

    return {
      deviceMessage,
      result: {
        agentConversationId: "",
        kind: "completed",
        output: deviceMessage.content,
        request: task.request,
        resolvedCommand: task.request,
        status: "error",
      },
    };
  }

  const activeTask = registerActiveAgentTask(turnId, {
    agentId: task.agentId,
    conversationId: task.userAssistantConversationId,
    request: task.request,
    startedAt: new Date().toISOString(),
    status: "running",
    title: task.userPrompt.trim().slice(0, 48) || "Tache agent",
  });

  try {
    if (task.agentId !== "device-agent") {
      const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
      const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
      const controller = new AbortController();
      registerAbortController(turnId, controller);
      onPipelineStageChange?.("agent-generating", task.agentId);
      const agentReply = await generateAgentTextReply(
        settings.openai,
        workspace.context,
        runtimeContext,
        task.request,
        task.userPrompt,
        "assistant",
        controller.signal,
      );
      unregisterAbortController(turnId, controller);
      throwIfTurnStopped(turnId);
      const deviceMessage = createAgentResultMessage(task.agentId, agentReply.text);
      deviceMessage.apiRequests = [...(agentReply.apiRecords ?? [])];
      const record = await recordAgentCommandExchange({
        agentId: task.agentId,
        agentConversationId: currentAgentConversationId,
        assistantRequest: task.request,
        command: task.request,
        result: {
          output: agentReply.text,
          status: "success",
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
          output: agentReply.text,
          request: task.request,
          resolvedCommand: task.request,
          status: "success",
        },
      };
    }

    onPipelineStageChange?.("agent-generating", task.agentId);
    const resolvedCommand = await resolveDeviceAgentCommand(settings, task);
    throwIfTurnStopped(turnId);
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
      const deviceErrorMessage = createDeviceImmediateErrorMessage(
        resolvedCommand,
        messageId,
        new Error("Commande refusee par une permission enregistree."),
        "assistant",
      );
      const deviceMessage = createDeviceAgentSummaryMessage(
        task.request,
        resolvedCommand,
        deviceErrorMessage.result ?? "",
        "denied",
      );
      const record = await recordAgentCommandExchange({
        agentId: task.agentId,
        agentConversationId: currentAgentConversationId,
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

    if (policyDecision.kind === "ask-always" || permissionLookup.decision === null) {
      updateActiveAgentTaskStatus(activeTask.taskId, "waiting-permission");
      onPipelineStageChange?.("waiting-permission", task.agentId);
      const { decision } = await requestDevicePermission(
        conversationId,
        resolvedCommand,
        emit,
        turnId,
        summarizePermissionRequest(task.request, resolvedCommand),
      );
      updateActiveAgentTaskStatus(activeTask.taskId, "running");

      if (decision === "cancel") {
        throw new TurnStoppedError();
      }

      if (decision === "allow-always") {
        if (policyDecision.kind === "ask") {
          await saveAgentPermission(
            settings.localFiles.agentsDirectory,
            task.agentId,
            resolvedCommand,
            "allow",
            true,
          );
        }
      }

      if (decision === "deny") {
        if (policyDecision.kind === "ask") {
          await saveAgentPermission(
            settings.localFiles.agentsDirectory,
            task.agentId,
            resolvedCommand,
            "deny",
            true,
          );
        }
        const deviceErrorMessage = createDeviceImmediateErrorMessage(
          resolvedCommand,
          messageId,
          new Error("Commande refusee par l'utilisateur."),
          "assistant",
        );
        const deviceMessage = createDeviceAgentSummaryMessage(
          task.request,
          resolvedCommand,
          deviceErrorMessage.result ?? "",
          "denied",
        );
        const record = await recordAgentCommandExchange({
          agentId: task.agentId,
          agentConversationId: currentAgentConversationId,
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
    }

    let deviceMessage: ChatMessage;

    try {
      const runningMessage = createRunningDeviceMessage(resolvedCommand, crypto.randomUUID(), "assistant", "device");
      onPipelineStageChange?.("executing-command", task.agentId);
      emit({ conversationId, messages: [runningMessage], type: "append-messages" });
      const executionMessage = await executeDeviceCommand({
        command: resolvedCommand,
        conversationId,
        emit,
        initialMessage: runningMessage,
        messageId: runningMessage.id,
        onProgressStateChange: (status) => updateActiveAgentTaskStatus(activeTask.taskId, status),
        resultRecipient: "assistant",
        resultSender: "device",
        turnId,
      });
      const status = normalizeDeviceStatus(executionMessage.status);
      deviceMessage = createDeviceAgentSummaryMessage(
        task.request,
        resolvedCommand,
        executionMessage.result ?? "",
        status,
      );
    } catch (error) {
      const deviceErrorMessage = createDeviceImmediateErrorMessage(resolvedCommand, messageId, error, "assistant");
      deviceMessage = createDeviceAgentSummaryMessage(
        task.request,
        resolvedCommand,
        deviceErrorMessage.result ?? "",
        "error",
      );
    }

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
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) {
      await recordAgentCommandExchange({
        agentId: task.agentId,
        agentConversationId: currentAgentConversationId,
        assistantRequest: task.request,
        command: task.request,
        result: {
          output: "Interrompu par l'utilisateur.",
          status: "interrupted",
        },
        rootDirectory: settings.localFiles.agentsDirectory,
        triggerMessageId: task.triggerMessageId,
        userAssistantConversationId: task.userAssistantConversationId,
        userPrompt: task.userPrompt,
      });
    }
    throw error;
  } finally {
    completeActiveAgentTask(activeTask.taskId);
  }
}

function getDeviceAgentAllowedWriteRoots(settings: AppSettings): string[] {
  return [
    process.cwd(),
    settings.localFiles.agentsDirectory,
    settings.localFiles.conversationsDirectory,
    settings.localFiles.settingsPath,
  ];
}

export async function createDirectAgentConversation(
  settings: AppSettings,
  agentId: AgentId,
  title: string,
): Promise<{ conversationId: string }> {
  return createAgentUserConversation(settings.localFiles.agentsDirectory, agentId, title);
}

export async function runDirectAgentConversationTurn(
  settings: AppSettings,
  agentId: AgentId,
  prompt: string,
  conversationId?: string | null,
): Promise<{ conversationId: string }> {
  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, agentId);
  const targetConversation = conversationId
    ? workspace.conversations.conversations.find((conversation) => conversation.id === conversationId) ?? null
    : null;
  const turnConversationId = targetConversation?.id ?? crypto.randomUUID();
  const turnId = startTurn(turnConversationId);
  const title = targetConversation?.title ?? (prompt.trim().slice(0, 48) || "Conversation agent");
  const activeTask = registerActiveAgentTask(turnId, {
    agentId,
    conversationId: turnConversationId,
    request: prompt,
    startedAt: new Date().toISOString(),
    status: "running",
    title,
  });

  try {
    const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
    const controller = new AbortController();
    registerAbortController(turnId, controller);
    const agentReply = await generateAgentTextReply(
      settings.openai,
      workspace.context,
      runtimeContext,
      prompt,
      prompt,
      "assistant",
      controller.signal,
    );
    unregisterAbortController(turnId, controller);
    throwIfTurnStopped(turnId);

    return appendDirectAgentExchange(
      settings.localFiles.agentsDirectory,
      agentId,
      prompt,
      agentReply.text,
      agentReply.apiRecords ?? [],
      targetConversation?.id ?? null,
    );
  } finally {
    completeActiveAgentTask(activeTask.taskId);
    finishTurn(turnId);
  }
}

async function resolveAgentConversationId(
  settings: AppSettings,
  task: AgentTaskRequest,
  turnId: string,
): Promise<string | null> {
  const activeConversationId = getAgentConversationId(turnId, task.agentId);
  if (activeConversationId) {
    return activeConversationId;
  }

  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const matchingHistoryEntry = workspace.history.find((entry) =>
    entry.triggerMessageId === task.triggerMessageId
      && entry.userAssistantConversationId === task.userAssistantConversationId,
  );

  if (!matchingHistoryEntry) {
    return null;
  }

  setAgentConversationId(turnId, task.agentId, matchingHistoryEntry.agentConversationId);
  return matchingHistoryEntry.agentConversationId;
}

function createAgentResultMessage(agentId: AgentTaskRequest["agentId"], content: string): ChatMessage {
  const createdAt = new Date().toISOString();
  return {
    agentId,
    apiRequests: [],
    content,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Resultat ${agentId} -> assistant cree.`,
        event: "created",
      },
    ],
    status: "success",
    to: "assistant",
  };
}

function createDeviceAgentSummaryMessage(
  taskRequest: string,
  command: string,
  output: string,
  status: "denied" | "error" | "partial-success" | "success",
): ChatMessage {
  const createdAt = new Date().toISOString();
  const summary = summarizeDeviceOutput(output, status);

  return {
    agentId: "device-agent",
    apiRequests: [],
    content: summary,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [
      {
        at: createdAt,
        details: "Reponse device-agent -> assistant creee.",
        event: "created",
        metadata: { command, status },
      },
    ],
    result: formatDeviceAgentTechnicalDetails(taskRequest, command, output, status),
    status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
    to: "assistant",
  };
}

function formatDeviceAgentTechnicalDetails(
  taskRequest: string,
  command: string,
  output: string,
  status: "denied" | "error" | "partial-success" | "success",
): string {
  if (status === "success") {
    return [
      "Execution terminee.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Resultat: ${output}`,
    ].join("\n");
  }

  if (status === "partial-success") {
    return [
      "Execution partiellement reussie.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Resultat partiel: ${output}`,
    ].join("\n");
  }

  if (status === "denied") {
    return [
      "Execution non autorisee.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Motif: ${output}`,
    ].join("\n");
  }

  return [
    "Execution echouee.",
    `Objectif: ${taskRequest}`,
    `Commande: ${command}`,
    `Erreur: ${output}`,
  ].join("\n");
}

function extractDeviceAgentSummaryOutput(message: ChatMessage): string {
  const lines = (message.result ?? message.content).split("\n");
  const resultLine = lines.find((line) => /^Resultat: |^Motif: |^Erreur: /i.test(line));
  return resultLine ? resultLine.replace(/^[^:]+:\s*/i, "") : message.content;
}

function summarizeDeviceOutput(
  output: string,
  status: "denied" | "error" | "partial-success" | "success",
): string {
  const cleaned = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^Journal:/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (status === "success") {
    return cleaned || "Execution terminee.";
  }

  if (status === "partial-success") {
    return cleaned || "Execution partiellement reussie.";
  }

  if (status === "denied") {
    return cleaned || "Execution non autorisee.";
  }

  return cleaned || "Execution echouee.";
}

function normalizeDeviceStatus(status?: ChatMessage["status"]): "error" | "partial-success" | "success" {
  if (status === "success") return "success";
  if (status === "partial-success") return "partial-success";
  return "error";
}

async function resolveDeviceAgentCommand(settings: AppSettings, task: AgentTaskRequest): Promise<string> {
  if (task.mode === "command" && isLikelyShellCommand(task.request)) {
    return task.request.trim();
  }

  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
  const controller = new AbortController();
  registerAbortController(task.turnId, controller);
  const deviceAgentReply = await generateDeviceAgentCommand(
    settings.openai,
    workspace.context,
    runtimeContext,
    task.request,
    task.userPrompt,
    controller.signal,
  );
  unregisterAbortController(task.turnId, controller);

  return deviceAgentReply.command.trim();
}

function isLikelyShellCommand(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\n/.test(trimmed)) return true;
  if (/[`$][({]/.test(trimmed)) return true;
  if (/\b(?:awk|cat|cut|df|echo|find|free|grep|head|ifconfig|ip|ls|nmap|ping|ps|route|sed|sw_vers|sysctl|tail|top|uname|vm_stat)\b/.test(trimmed)) {
    return true;
  }
  if (/[|&;<>]/.test(trimmed)) return true;
  if (/^(?:\w+=.+\s+)+(?:[A-Za-z_./-]+)/.test(trimmed)) return true;
  if (/^[./~A-Za-z0-9_-]+\s+[-]/.test(trimmed)) return true;
  return false;
}

function summarizePermissionRequest(taskRequest: string, command: string): string {
  const requestSummary = taskRequest
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const firstCommandLine = command
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? command.trim();

  return `${requestSummary} | Commande: ${firstCommandLine.slice(0, 140)}`;
}
