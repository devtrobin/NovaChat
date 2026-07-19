import { ChatMessage } from "../../shared/chat.types";
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
    visibility: "public",
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
    visibility: "internal",
  };
}

export function createPermissionRequestSystemMessage(
  command: string,
  requestId: string,
  summary?: string,
): ChatMessage {
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
      {
        id: "permission-deny-always",
        label: "Toujours refuser",
        payload: { requestId },
      },
    ],
    apiRequests: [],
    content: [
      "Permission requise pour Device.",
      summary ? `Action demandee : ${summary}` : "L'assistant principal souhaite executer une commande locale.",
      "",
      "Commande proposee :",
      formatCommandPreview(command),
    ].join("\n"),
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Demande de permission systeme creee.")],
    status: "pending",
    to: "user",
    visibility: "public",
  };
}

export function createPermissionResolutionSystemMessage(
  decision: "allow" | "allow-always" | "deny" | "deny-always",
  command: string,
  summary?: string,
): ChatMessage {
  const content = decision === "allow"
    ? [
        "Permission accordee une fois.",
        summary ? `Action : ${summary}` : "La commande va etre executee.",
        "",
        "Commande :",
        formatCommandPreview(command),
      ].join("\n")
    : decision === "allow-always"
      ? [
        "Permission accordee de maniere permanente.",
        summary ? `Action : ${summary}` : "La commande a ete memorisee dans les permissions.",
        "",
        "Commande :",
        formatCommandPreview(command),
      ].join("\n")
      : decision === "deny-always"
        ? [
          "Permission refusee de maniere permanente.",
          summary ? `Action : ${summary}` : "La commande a ete memorisee dans les permissions refusees.",
          "",
          "Commande :",
          formatCommandPreview(command),
        ].join("\n")
        : [
          "Permission refusee une fois.",
          summary ? `Action : ${summary}` : "La commande ne sera pas executee cette fois.",
          "",
          "Commande :",
          formatCommandPreview(command),
        ].join("\n");

  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Resolution de permission systeme creee.")],
    status: "idle",
    to: "user",
    visibility: "public",
  };
}

export function createInterruptedSystemMessage(): ChatMessage {
  return {
    apiRequests: [],
    content: "Tache interrompue par l'utilisateur.",
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Interruption utilisateur enregistree.")],
    status: "idle",
    to: "user",
    visibility: "public",
  };
}

function formatCommandPreview(command: string): string {
  const compact = command
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length <= 260) {
    return compact;
  }

  return `${compact.slice(0, 257)}...`;
}
