import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { AppSettings } from "../../shared/settings.types";
import {
  getAgentPermission,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "../agents/agent-storage.service";
import { Emit } from "./ai.orchestrator.types";
import { executeDeviceCommand } from "./ai.device-flow";
import { createDeviceImmediateErrorMessage } from "./ai.message-factory";
import { requestDevicePermission } from "./ai.permission.service";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { generateOpenAIReply } from "./openai.service";
import {
  appendUserApiTrace,
  createAssistantResponseMessage,
  createDeviceRequestMessage,
  createInterruptedCommandContextMessage,
  createThinkingSystemMessage,
} from "./ai.orchestrator.cycle.messages";

type RunAssistantCycleArgs = {
  conversationId: string;
  emit: Emit;
  settings: AppSettings;
  step: number;
  turnMessages: ChatMessage[];
  userMessage: ChatMessage;
};

export async function runAssistantCycle({
  conversationId,
  emit,
  settings,
  step,
  turnMessages,
  userMessage,
}: RunAssistantCycleArgs): Promise<
  | { kind: "assistant"; message: ChatMessage }
  | { deviceMessage: ChatMessage; kind: "device" }
> {
  const { apiRecords, providerResponse } = await generateOpenAIReply(settings.openai, turnMessages);
  emit({
    conversationId,
    message: appendUserApiTrace(userMessage, apiRecords, step),
    messageId: userMessage.id,
    type: "replace-message",
  });

  if (providerResponse.to === "user") {
    return { kind: "assistant", message: createAssistantResponseMessage(providerResponse.content, apiRecords) };
  }

  const runningMessage = createDeviceRequestMessage(providerResponse.content, apiRecords);
  emit({ conversationId, messages: [runningMessage], type: "append-messages" });

  let deviceMessage: ChatMessage;
  const permissionLookup = await getAgentPermission(
    settings.localFiles.agentsDirectory,
    "device-agent",
    providerResponse.content,
  );

  if (permissionLookup.decision === "deny") {
    deviceMessage = createDeviceImmediateErrorMessage(
      providerResponse.content,
      runningMessage.id,
      new Error("Commande refusee par une permission enregistree."),
    );
    emit({
      conversationId,
      message: deviceMessage,
      messageId: runningMessage.id,
      type: "replace-message",
    });
    await recordAgentCommandExchange({
      agentId: "device-agent",
      command: providerResponse.content,
      result: {
        output: deviceMessage.result ?? "",
        status: "denied",
      },
      rootDirectory: settings.localFiles.agentsDirectory,
      triggerMessageId: userMessage.id,
      userAssistantConversationId: conversationId,
      userPrompt: userMessage.content,
    });
    deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
    appendLifecycleLog(deviceMessage, "assistant-device-cycle-complete", "Cycle assistant -> device termine.");
    turnMessages.push(deviceMessage);
    return { deviceMessage, kind: "device" };
  }

  if (permissionLookup.decision === null) {
    const { decision } = await requestDevicePermission(conversationId, providerResponse.content, emit);

    if (decision === "allow-always") {
      await saveAgentPermission(
        settings.localFiles.agentsDirectory,
        "device-agent",
        providerResponse.content,
        "allow",
        true,
      );
    }

    if (decision === "deny") {
      await saveAgentPermission(
        settings.localFiles.agentsDirectory,
        "device-agent",
        providerResponse.content,
        "deny",
        true,
      );
      deviceMessage = createDeviceImmediateErrorMessage(
        providerResponse.content,
        runningMessage.id,
        new Error("Commande refusee par l'utilisateur."),
      );
      emit({
        conversationId,
        message: deviceMessage,
        messageId: runningMessage.id,
        type: "replace-message",
      });
      await recordAgentCommandExchange({
        agentId: "device-agent",
        command: providerResponse.content,
        result: {
          output: deviceMessage.result ?? "",
          status: "denied",
        },
        rootDirectory: settings.localFiles.agentsDirectory,
        triggerMessageId: userMessage.id,
        userAssistantConversationId: conversationId,
        userPrompt: userMessage.content,
      });
      deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
      appendLifecycleLog(deviceMessage, "assistant-device-cycle-complete", "Cycle assistant -> device termine.");
      turnMessages.push(deviceMessage);
      return { deviceMessage, kind: "device" };
    }
  }

  try {
    deviceMessage = await executeDeviceCommand({
      command: providerResponse.content,
      conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      resultRecipient: "assistant",
      resultSender: "device",
    });
  } catch (error) {
    deviceMessage = createDeviceImmediateErrorMessage(providerResponse.content, runningMessage.id, error);
    emit({
      conversationId,
      message: deviceMessage,
      messageId: runningMessage.id,
      type: "replace-message",
    });
  }

  await recordAgentCommandExchange({
    agentId: "device-agent",
    command: providerResponse.content,
    result: {
      output: deviceMessage.result ?? "",
      status: deviceMessage.status === "success" ? "success" : "error",
    },
    rootDirectory: settings.localFiles.agentsDirectory,
    triggerMessageId: userMessage.id,
    userAssistantConversationId: conversationId,
    userPrompt: userMessage.content,
  });

  deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
  appendLifecycleLog(deviceMessage, "assistant-device-cycle-complete", "Cycle assistant -> device termine.");
  turnMessages.push(deviceMessage);

  return { deviceMessage, kind: "device" };
}

export function restartAssistantThinking(
  conversationId: string,
  emit: Emit,
  previousSystemMessageId: string,
): ChatMessage {
  emit({
    conversationId,
    messageId: previousSystemMessageId,
    type: "remove-message",
  });
  const nextSystemMessage = createThinkingSystemMessage();
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
