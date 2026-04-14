import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { AppSettings } from "../../shared/settings.types";
import { Emit } from "./ai.orchestrator.types";
import { executeDeviceCommand } from "./ai.device-flow";
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

  const deviceMessage = await executeDeviceCommand({
    command: providerResponse.content,
    conversationId,
    emit,
    initialMessage: runningMessage,
    messageId: runningMessage.id,
    resultRecipient: "assistant",
    resultSender: "device",
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
