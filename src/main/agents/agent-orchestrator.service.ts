import { AppSettings } from "../../shared/settings.types";
import {
  loadAgentWorkspace,
  recordAgentCommandExchange,
} from "./agent-storage.service";
import { runAELAgentTask } from "./agent-task.ael";
import { createAgentResultMessage } from "./agent-task.messages";
import { runACPAgentTask } from "./agent-task.acp";
import {
  AgentTaskExecutionResult,
  RunAgentTaskArgs,
} from "./agent-task.types";
import {
  completeActiveAgentTask,
  getAgentConversationId,
  registerActiveAgentTask,
  setAgentConversationId,
  TurnStoppedError,
} from "../ai/ai.turn-registry";

export async function runAgentTask(
  args: RunAgentTaskArgs,
): Promise<AgentTaskExecutionResult> {
  const {
    settings,
    task,
    turnId,
  } = args;
  if (task.mode === "write-file" && task.agentId !== "agent-ael") throw new Error("La creation de fichier appartient a AEL.");
  const currentAgentConversationId = await resolveAgentConversationId(settings, task, turnId);
  if (!settings.agents[task.agentId]?.enabled) {
    const aelMessage = createAgentResultMessage(
      task.agentId,
      `L'agent ${task.agentId} est actuellement desactive.`,
    );

    return {
      aelMessage,
      result: {
        agentConversationId: "",
        kind: "completed",
        output: aelMessage.content,
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
    return task.agentId === "agent-ael"
      ? await runAELAgentTask(args, activeTask.taskId, currentAgentConversationId)
      : await runACPAgentTask(args, currentAgentConversationId);
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) {
      await recordAgentCommandExchange({
        agentId: task.agentId,
        agentConversationId: currentAgentConversationId,
        apiTraceSettings: settings.apiTrace,
        assistantRequest: task.request,
        command: task.request,
        operation: task.mode === "write-file" ? "write-file" : undefined,
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

async function resolveAgentConversationId(
  settings: AppSettings,
  task: RunAgentTaskArgs["task"],
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
