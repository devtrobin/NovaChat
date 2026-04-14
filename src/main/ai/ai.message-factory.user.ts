import { ChatMessage } from "../../renderer/types/chat.types";
import { createLifecycleEntry } from "./ai.orchestrator.runtime";

export function createUserMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "user",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message utilisateur cree.")],
    to: "assistant",
  };
}
