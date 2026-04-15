import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentTaskRequest, AgentTaskResult } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import {
  getAgentPermission,
  loadAgentWorkspace,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "./agent-storage.service";
import { Emit } from "../ai/ai.orchestrator.types";
import { generateAgentTextReply, generateDeviceAgentCommand } from "../ai/openai.service";
import { requestDevicePermission } from "../ai/ai.permission.service";
import { executeDeviceCommand } from "../ai/ai.device-flow";
import { createDeviceImmediateErrorMessage } from "../ai/ai.message-factory";
import {
  completeActiveAgentTask,
  registerAbortController,
  registerActiveAgentTask,
  TurnStoppedError,
  throwIfTurnStopped,
  unregisterAbortController,
  updateActiveAgentTaskStatus,
} from "../ai/ai.turn-registry";

type RunAgentTaskArgs = {
  conversationId: string;
  emit: Emit;
  initialMessage: ChatMessage;
  messageId: string;
  settings: AppSettings;
  task: AgentTaskRequest;
  turnId: string;
};

export async function runAgentTask({
  conversationId,
  emit,
  initialMessage,
  messageId,
  settings,
  task,
  turnId,
}: RunAgentTaskArgs): Promise<{ deviceMessage: ChatMessage; result: AgentTaskResult }> {
  if (!settings.agents[task.agentId]?.enabled) {
    const deviceMessage = createAgentResultMessage(
      task.agentId,
      `L'agent ${task.agentId} est actuellement desactive.`,
      messageId,
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
      const controller = new AbortController();
      registerAbortController(turnId, controller);
      const agentReply = await generateAgentTextReply(
        settings.openai,
        workspace.context,
        task.request,
        task.userPrompt,
        controller.signal,
      );
      unregisterAbortController(turnId, controller);
      throwIfTurnStopped(turnId);
      const deviceMessage = createAgentResultMessage(task.agentId, agentReply.text, messageId);
      deviceMessage.apiRequests = [...(agentReply.apiRecords ?? [])];
      const record = await recordAgentCommandExchange({
        agentId: task.agentId,
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

    const resolvedCommand = await resolveDeviceAgentCommand(settings, task);
    throwIfTurnStopped(turnId);
    const permissionLookup = await getAgentPermission(
      settings.localFiles.agentsDirectory,
      task.agentId,
      resolvedCommand,
    );

    if (permissionLookup.decision === "deny") {
      const deviceMessage = createDeviceImmediateErrorMessage(
        resolvedCommand,
        messageId,
        new Error("Commande refusee par une permission enregistree."),
        "assistant",
      );
      const record = await recordAgentCommandExchange({
        agentId: task.agentId,
        assistantRequest: task.request,
        command: resolvedCommand,
        result: {
          output: deviceMessage.result ?? "",
          status: "denied",
        },
        rootDirectory: settings.localFiles.agentsDirectory,
        triggerMessageId: task.triggerMessageId,
        userAssistantConversationId: task.userAssistantConversationId,
        userPrompt: task.userPrompt,
      });

      return {
        deviceMessage,
        result: {
          agentConversationId: record.agentConversationId,
          kind: "permission-denied",
          output: deviceMessage.result ?? "",
          request: task.request,
          resolvedCommand,
        },
      };
    }

    if (permissionLookup.decision === null) {
      updateActiveAgentTaskStatus(activeTask.taskId, "waiting-permission");
      const { decision } = await requestDevicePermission(conversationId, resolvedCommand, emit, turnId);
      updateActiveAgentTaskStatus(activeTask.taskId, "running");

      if (decision === "cancel") {
        throw new TurnStoppedError();
      }

      if (decision === "allow-always") {
        await saveAgentPermission(
          settings.localFiles.agentsDirectory,
          task.agentId,
          resolvedCommand,
          "allow",
          true,
        );
      }

      if (decision === "deny") {
        await saveAgentPermission(
          settings.localFiles.agentsDirectory,
          task.agentId,
          resolvedCommand,
          "deny",
          true,
        );
        const deviceMessage = createDeviceImmediateErrorMessage(
          resolvedCommand,
          messageId,
          new Error("Commande refusee par l'utilisateur."),
          "assistant",
        );
        const record = await recordAgentCommandExchange({
          agentId: task.agentId,
          assistantRequest: task.request,
          command: resolvedCommand,
          result: {
            output: deviceMessage.result ?? "",
            status: "denied",
          },
          rootDirectory: settings.localFiles.agentsDirectory,
          triggerMessageId: task.triggerMessageId,
          userAssistantConversationId: task.userAssistantConversationId,
          userPrompt: task.userPrompt,
        });

        return {
          deviceMessage,
          result: {
            agentConversationId: record.agentConversationId,
            kind: "permission-denied",
            output: deviceMessage.result ?? "",
            request: task.request,
            resolvedCommand,
          },
        };
      }
    }

    let deviceMessage: ChatMessage;

    try {
      deviceMessage = await executeDeviceCommand({
        command: resolvedCommand,
        conversationId,
        emit,
        initialMessage,
        messageId,
        onProgressStateChange: (status) => updateActiveAgentTaskStatus(activeTask.taskId, status),
        resultRecipient: "assistant",
        resultSender: "device",
        turnId,
      });
    } catch (error) {
      deviceMessage = createDeviceImmediateErrorMessage(resolvedCommand, messageId, error, "assistant");
      emit({
        conversationId,
        message: deviceMessage,
        messageId,
        type: "replace-message",
      });
    }

    const record = await recordAgentCommandExchange({
      agentId: task.agentId,
      assistantRequest: task.request,
      command: resolvedCommand,
      result: {
        output: deviceMessage.result ?? "",
        status: deviceMessage.status === "success" ? "success" : "error",
      },
      rootDirectory: settings.localFiles.agentsDirectory,
      triggerMessageId: task.triggerMessageId,
      userAssistantConversationId: task.userAssistantConversationId,
      userPrompt: task.userPrompt,
    });

    return {
      deviceMessage,
      result: {
        agentConversationId: record.agentConversationId,
        kind: "completed",
        output: deviceMessage.result ?? "",
        request: task.request,
        resolvedCommand,
        status: deviceMessage.status === "success" ? "success" : "error",
      },
    };
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) {
      await recordAgentCommandExchange({
        agentId: task.agentId,
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

function createAgentResultMessage(agentId: AgentTaskRequest["agentId"], content: string, id: string): ChatMessage {
  return {
    agentId,
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "agent",
    id,
    lifecycleLog: [
      {
        at: new Date().toISOString(),
        details: `Resultat ${agentId} -> assistant cree.`,
        event: "created",
      },
    ],
    status: "success",
    to: "assistant",
  };
}

async function resolveDeviceAgentCommand(settings: AppSettings, task: AgentTaskRequest): Promise<string> {
  if (task.mode === "command") {
    return task.request;
  }

  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const controller = new AbortController();
  registerAbortController(task.turnId, controller);
  const deviceAgentReply = await generateDeviceAgentCommand(
    settings.openai,
    workspace.context,
    task.request,
    task.userPrompt,
    controller.signal,
  );
  unregisterAbortController(task.turnId, controller);

  return deviceAgentReply.command;
}
