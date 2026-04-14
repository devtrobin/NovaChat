import { ChatMessage } from "../../types/chat.types";

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
    .find((entry) => entry.event === "device-finished" || entry.event === "device-killed")?.metadata;
}

export function isDeviceMessage(message: ChatMessage): boolean {
  return message.to === "device" || message.from === "device";
}

export function isSystemMessage(message: ChatMessage): boolean {
  return message.from === "system";
}
