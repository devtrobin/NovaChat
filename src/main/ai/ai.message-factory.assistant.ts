import { ChatMessage } from "../../shared/chat.types";
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
    visibility: "public",
  };
}

export function createAssistantDelegationMessage(
  content: string,
  to: "agent" | "ael",
  agentId?: "agent-acp" | "agent-ael",
): ChatMessage {
  const message = createAssistantMessage(content);
  message.to = to;
  message.visibility = "internal";
  if (agentId) {
    message.agentId = agentId;
  }
  return message;
}

export function createAssistantErrorMessage(content: string): ChatMessage {
  return createAssistantMessage(content);
}

export function attachAssistantApiTrace(message: ChatMessage, apiRequests: ChatMessage["apiRequests"]) {
  message.apiRequests = [...(apiRequests ?? [])];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee au message assistant.");
}
