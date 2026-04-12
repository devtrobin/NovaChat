import { ChatMessage } from "../../renderer/types/chat.types";
import { ChatTurnEvent, RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import { awaitDeviceCommand, startDeviceCommand } from "../device/device.service";
import { generateOpenAIReply } from "./openai.service";

type Emit = (event: ChatTurnEvent) => void;

export async function runTurn(
  request: RunTurnRequest,
  settings: AppSettings,
  emit: Emit,
): Promise<RunTurnResult> {
  if (!settings.openai.apiKey || !settings.openai.model) {
    const systemMessage = createSystemMessage(
      "Configuration OpenAI manquante.",
      "Ouvrir les parametres",
    );
    emit({ conversationId: request.conversationId, messages: [systemMessage], type: "append-messages" });
    globalThis.setTimeout(() => {
      emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    }, 4500);
    return { ok: false };
  }

  const userMessage = createUserMessage(request.userInput);
  const systemMessage = createSystemMessage("Tache en cours: generation de la reponse...");
  const pendingAssistantMessage = createPendingAssistantMessage();
  emit({
    conversationId: request.conversationId,
    messages: [userMessage, systemMessage, pendingAssistantMessage],
    type: "append-messages",
  });

  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }

  const turnMessages: ChatMessage[] = [...request.messages, userMessage];
  let activePendingId = pendingAssistantMessage.id;

  try {
    for (let step = 0; step < 4; step += 1) {
      const providerResponse = await generateOpenAIReply(settings.openai, turnMessages);

      if (providerResponse.to === "user") {
        const finalMessage = createAssistantMessage(providerResponse.content, activePendingId);
        emit({
          conversationId: request.conversationId,
          message: finalMessage,
          messageId: activePendingId,
          type: "replace-message",
        });
        emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
        return { ok: true };
      }

      const runningCommand = startDeviceCommand(providerResponse.content);
      const runningMessage = createRunningDeviceMessage(providerResponse.content, activePendingId, runningCommand.commandId);
      emit({
        conversationId: request.conversationId,
        message: runningMessage,
        messageId: activePendingId,
        type: "replace-message",
      });

      const commandResult = await awaitDeviceCommand(runningCommand.commandId);
      const deviceMessage = createDeviceResultMessage(providerResponse.content, activePendingId, commandResult);
      emit({
        conversationId: request.conversationId,
        message: deviceMessage,
        messageId: activePendingId,
        type: "replace-message",
      });

      turnMessages.push(deviceMessage);
      const nextPending = createPendingAssistantMessage();
      activePendingId = nextPending.id;
      emit({
        conversationId: request.conversationId,
        messages: [nextPending],
        type: "append-messages",
      });
    }
  } catch (error) {
    const errorMessage = createAssistantErrorMessage(activePendingId);
    emit({
      conversationId: request.conversationId,
      message: errorMessage,
      messageId: activePendingId,
      type: "replace-message",
    });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: false };
  }

  emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
  return { ok: false };
}

function createAssistantMessage(content: string, id: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    from: "assistant",
    id,
    status: "idle",
    to: "user",
  };
}

function createAssistantErrorMessage(id: string): ChatMessage {
  return createAssistantMessage("Erreur durant la generation de la reponse.", id);
}

function createPendingAssistantMessage(): ChatMessage {
  return {
    content: "",
    createdAt: new Date().toISOString(),
    from: "assistant",
    id: crypto.randomUUID(),
    status: "streaming",
    to: "user",
  };
}

function createRunningDeviceMessage(command: string, id: string, commandId: string): ChatMessage {
  return {
    commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from: "assistant",
    id,
    isExpandable: true,
    status: "running",
    to: "device",
  };
}

function createDeviceResultMessage(command: string, id: string, result: { commandId: string; ok: boolean; output: string }): ChatMessage {
  return {
    commandId: result.commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from: "device",
    id,
    isExpandable: true,
    result: result.output,
    status: result.ok ? "success" : "error",
    to: "assistant",
  };
}

function createSystemMessage(content: string, actionLabel?: string): ChatMessage {
  return {
    actionLabel,
    actionType: actionLabel ? "open-settings" : undefined,
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    status: "running",
    to: "user",
  };
}

function createUserMessage(content: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    from: "user",
    id: crypto.randomUUID(),
    to: "assistant",
  };
}

function shouldSetTitle(request: RunTurnRequest): boolean {
  return request.messages.filter((message) => message.from !== "system").length === 0;
}
