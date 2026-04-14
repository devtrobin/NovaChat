import { ChatMessage } from "../../renderer/types/chat.types";
import { createLifecycleEntry } from "./ai.orchestrator.runtime";

export function createSystemMessage(content: string, actionLabel?: string): ChatMessage {
  return {
    actionLabel,
    actionType: actionLabel ? "open-settings" : undefined,
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message systeme cree.")],
    status: "running",
    to: "user",
  };
}

export function createInternalSystemMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message systeme interne cree.")],
    status: "idle",
    to: "assistant",
  };
}
