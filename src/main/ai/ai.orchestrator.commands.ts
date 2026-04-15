import { ChatMessage } from "../../renderer/types/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import {
  createDeviceImmediateErrorMessage,
  createInterruptedSystemMessage,
  createRunningDeviceMessage,
  createSystemMessage,
} from "./ai.message-factory";
import { appendLifecycleLog, extractDirectCommand, shouldSetTitle } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { executeDeviceCommand } from "./ai.device-flow";
import { finishTurn, startTurn, TurnStoppedError } from "./ai.turn-registry";

export async function runDirectCommandTurn(
  request: RunTurnRequest,
  userMessage: ChatMessage,
  emit: Emit,
): Promise<RunTurnResult> {
  const turnId = startTurn(request.conversationId);
  const command = extractDirectCommand(request.userInput);
  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }

  const systemMessage = createSystemMessage("Tache en cours: execution de la commande...");
  emit({
    conversationId: request.conversationId,
    messages: [userMessage, systemMessage],
    type: "append-messages",
  });

  const runningMessage = createRunningDeviceMessage(command, "", "user", "device");
  appendLifecycleLog(runningMessage, "user-requested-device", "L'utilisateur a demande une execution device.", {
    command,
    from: "user",
    to: "device",
  });
  emit({ conversationId: request.conversationId, messages: [runningMessage], type: "append-messages" });

  try {
    await executeDeviceCommand({
      command,
      conversationId: request.conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      resultRecipient: "user",
      resultSender: "device",
      turnId,
    });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: true };
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) {
      emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
      emit({ conversationId: request.conversationId, messages: [createInterruptedSystemMessage()], type: "append-messages" });
      return { ok: false };
    }
    const errorMessage = createDeviceImmediateErrorMessage(command, runningMessage.id, error);
    emit({
      conversationId: request.conversationId,
      message: errorMessage,
      messageId: runningMessage.id,
      type: "replace-message",
    });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: false };
  } finally {
    finishTurn(turnId);
  }
}
