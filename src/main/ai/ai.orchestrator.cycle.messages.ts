import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import {
  attachAssistantApiTrace,
  createAssistantMessage,
  createInternalSystemMessage,
  createRunningDeviceMessage,
  createSystemMessage,
} from "./ai.message-factory";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";

export function appendUserApiTrace(
  userMessage: ChatMessage,
  apiRecords: ApiRequestRecord[],
  step: number,
): ChatMessage {
  appendLifecycleLog(userMessage, "api-request-sent", `Requete ${step + 1} envoyee a l'assistant.`);
  appendLifecycleLog(userMessage, "api-response-received", `Reponse ${step + 1} recue depuis l'assistant.`);
  userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...apiRecords];
  return { ...userMessage };
}

export function createAssistantResponseMessage(content: string, apiRecords: ApiRequestRecord[]): ChatMessage {
  const message = createAssistantMessage(content);
  attachAssistantApiTrace(message, apiRecords);
  return message;
}

export function createDeviceRequestMessage(command: string, apiRecords: ApiRequestRecord[]): ChatMessage {
  const message = createRunningDeviceMessage(command, "");
  message.apiRequests = [...apiRecords];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee a la commande device.");
  appendLifecycleLog(
    message,
    "assistant-requested-device",
    "L'assistant a demande une execution device.",
    { command, from: "assistant", to: "device" },
  );
  return message;
}

export function createThinkingSystemMessage(): ChatMessage {
  return createSystemMessage("Tache en cours: generation de la reponse...");
}

export function createInterruptedCommandContextMessage(): ChatMessage {
  return createInternalSystemMessage(
    "L'utilisateur a mis un terme a la commande device. Tu peux repondre directement sans nouvelle commande.",
  );
}
