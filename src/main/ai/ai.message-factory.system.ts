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

export function createPermissionRequestSystemMessage(command: string, requestId: string): ChatMessage {
  return {
    actions: [
      {
        id: "permission-allow",
        label: "Oui",
        payload: { requestId },
      },
      {
        id: "permission-allow-always",
        label: "Oui permanent",
        payload: { requestId },
      },
      {
        id: "permission-deny",
        label: "Non",
        payload: { requestId },
      },
    ],
    apiRequests: [],
    content: `Autoriser l'agent Device a executer cette commande ?\n${command}`,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Demande de permission systeme creee.")],
    status: "pending",
    to: "user",
  };
}
