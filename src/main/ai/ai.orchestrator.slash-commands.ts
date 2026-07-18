import { ChatMessage } from "../../renderer/types/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import { createAssistantMessage, createSystemMessage } from "./ai.message-factory";
import { shouldSetTitle } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { parseSlashCommand, resolveSlashCommandResponse } from "./ai.slash-commands";

export function runSlashCommandTurn(
  request: RunTurnRequest,
  settings: AppSettings,
  userMessage: ChatMessage,
  emit: Emit,
): RunTurnResult {
  const parsed = parseSlashCommand(request.userInput);
  if (!parsed) {
    return { ok: false };
  }

  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }

  const response = resolveSlashCommandResponse(parsed, settings);
  const responseMessage = response.openSettings
    ? createSystemMessage(response.content, "Ouvrir les paramètres")
    : createAssistantMessage(response.content);

  if (response.openSettings) {
    responseMessage.status = "idle";
  }

  emit({
    conversationId: request.conversationId,
    messages: [userMessage, responseMessage],
    type: "append-messages",
  });
  return { ok: true };
}
