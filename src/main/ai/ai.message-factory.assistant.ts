import { ChatMessage } from "../../renderer/types/chat.types";
import { appendLifecycleLog, createLifecycleEntry } from "./ai.orchestrator.runtime";

export function createAssistantMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message assistant cree.")],
    status: "idle",
    to: "user",
  };
}

export function createAssistantErrorMessage(content: string): ChatMessage {
  return createAssistantMessage(content);
}

export function attachAssistantApiTrace(message: ChatMessage, apiRequests: ChatMessage["apiRequests"]) {
  message.apiRequests = [...(apiRequests ?? [])];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee au message assistant.");
}
