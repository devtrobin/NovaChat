import { ChatMessage } from "../../shared/chat.types";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { requestAssistantReply } from "./ai.orchestrator.assistant-request";
import {
  appendUserApiTrace,
  createAssistantResponseMessage,
} from "./ai.orchestrator.cycle.messages";
import { Emit } from "./ai.orchestrator.types";

type FinalizeTurnArgs = {
  conversationId: string;
  emit: Emit;
  settings: RuntimeAppSettings;
  step: number;
  turnId: string;
  turnMessages: ChatMessage[];
  userMessage: ChatMessage;
};

export async function requestFinalSynthesis({
  conversationId,
  emit,
  settings,
  step,
  turnId,
  turnMessages,
  userMessage,
}: FinalizeTurnArgs): Promise<{ message: ChatMessage; ok: boolean }> {
  const { apiRecords, providerResponse } = await requestAssistantReply(
    settings,
    turnId,
    turnMessages,
    true,
  );
  emit({
    conversationId,
    message: appendUserApiTrace(userMessage, apiRecords, step),
    messageId: userMessage.id,
    type: "replace-message",
  });

  if (providerResponse.to === "user") {
    return {
      message: createAssistantResponseMessage(providerResponse.content, apiRecords),
      ok: true,
    };
  }

  return {
    message: createAssistantResponseMessage(
      [
        "J'ai atteint la limite d'execution automatique et j'ai arrete les delegations pour eviter une boucle.",
        "Les resultats intermediaires restent disponibles dans la conversation, mais le provider n'a pas produit la synthese finale demandee.",
      ].join(" "),
      apiRecords,
    ),
    ok: false,
  };
}
