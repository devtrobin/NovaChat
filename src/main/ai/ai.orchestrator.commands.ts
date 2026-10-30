import { ChatMessage } from "../../shared/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import {
  createAELImmediateErrorMessage,
  createInterruptedSystemMessage,
  createRunningAELMessage,
  createSystemMessage,
} from "./ai.message-factory";
import { appendLifecycleLog, extractDirectCommand, shouldSetTitle } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { executeAELCommand } from "./ai.ael-flow";
import { finishTurn, startTurn, TurnStoppedError } from "./ai.turn-registry";

export async function runDirectCommandTurn(
  request: RunTurnRequest,
  settings: AppSettings,
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

  const runningMessage = createRunningAELMessage(command, "", "user", "ael");
  appendLifecycleLog(runningMessage, "user-requested-ael", "L'utilisateur a demande une execution AEL.", {
    command,
    from: "user",
    to: "ael",
  });
  emit({ conversationId: request.conversationId, messages: [runningMessage], type: "append-messages" });

  try {
    await executeAELCommand({
      command,
      conversationId: request.conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      options: settings.aelExecution,
      resultRecipient: "user",
      resultSender: "ael",
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
    const errorMessage = createAELImmediateErrorMessage(command, runningMessage.id, error);
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
