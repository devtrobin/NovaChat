import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { DevicePolicyError } from "../device/device.types";
import {
  attachAssistantApiTrace,
  createAssistantErrorMessage,
  createSystemMessage,
} from "./ai.message-factory";
import { classifyRuntimeError } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { appendApiErrorTrace } from "./ai.orchestrator.cycle";
import { NovaResponseParseError, OpenAIRequestError } from "./openai.types";

export async function handleTurnError(
  conversationId: string,
  error: unknown,
  emit: Emit,
  systemMessageId: string,
  userMessage: ChatMessage,
): Promise<void> {
  let errorApiRecords: ApiRequestRecord[] = [];
  let errorDisplayMessage = "Erreur durant la generation de la reponse.";

  if (error instanceof OpenAIRequestError) {
    errorApiRecords = error.apiRecords;
    errorDisplayMessage = error.displayMessage;
    emit({
      conversationId,
      message: appendApiErrorTrace(userMessage, error.apiRecords, "Erreur recue depuis l'assistant."),
      messageId: userMessage.id,
      type: "replace-message",
    });
  } else if (error instanceof NovaResponseParseError) {
    errorApiRecords = error.apiRecords;
    errorDisplayMessage = error.displayMessage;
    emit({
      conversationId,
      message: appendApiErrorTrace(userMessage, error.apiRecords, "Reponse assistant invalide pour Nova."),
      messageId: userMessage.id,
      type: "replace-message",
    });
  } else if (error instanceof DevicePolicyError) {
    errorDisplayMessage = `Commande refusee par la policy device: ${error.message}`;
  } else if (error instanceof Error) {
    errorDisplayMessage = classifyRuntimeError(error);
  }

  const errorMessage = createAssistantErrorMessage(errorDisplayMessage);
  attachAssistantApiTrace(errorMessage, errorApiRecords);
  emit({ conversationId, messages: [errorMessage], type: "append-messages" });
  emit({ conversationId, messageId: systemMessageId, type: "remove-message" });
}

export function handleMissingOpenAIConfig(
  request: RunTurnRequest,
  userMessage: ChatMessage,
  emit: Emit,
): RunTurnResult {
  const systemMessage = createSystemMessage(
    "Configuration OpenAI manquante.",
    "Ouvrir les parametres",
  );
  emit({ conversationId: request.conversationId, messages: [userMessage, systemMessage], type: "append-messages" });
  globalThis.setTimeout(() => {
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
  }, 4500);
  return { ok: false };
}
