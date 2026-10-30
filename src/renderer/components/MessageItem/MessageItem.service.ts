import { ChatMessage } from "../../../shared/chat.types";

export function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDuration(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

export function getExecutionMetadata(message: ChatMessage) {
  return [...(message.lifecycleLog ?? [])]
    .reverse()
    .find((entry) => entry.event === "ael-finished" || entry.event === "ael-killed")?.metadata;
}

export function isAELMessage(message: ChatMessage): boolean {
  return message.from === "ael"
    || (
      message.to === "ael"
      && (Boolean(message.commandId) || message.status === "running" || message.status === "waiting-input")
    );
}

export function isSystemMessage(message: ChatMessage): boolean {
  return message.from === "system";
}
