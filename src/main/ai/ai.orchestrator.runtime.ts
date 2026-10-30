import { ChatMessage } from "../../shared/chat.types";
import { RunTurnRequest } from "../../shared/ai.types";
import { parseSlashCommand } from "./ai.slash-commands";

export function shouldSetTitle(request: RunTurnRequest): boolean {
  return request.messages.filter((message) => message.from !== "system").length === 0;
}

export function isDirectCommand(input: string): boolean {
  const parsed = parseSlashCommand(input);
  return parsed?.definition?.name === "cmd" && Boolean(parsed.args);
}

export function extractDirectCommand(input: string): string {
  return parseSlashCommand(input)?.args ?? "";
}

export function isSlashCommand(input: string): boolean {
  return parseSlashCommand(input) !== null;
}

export function createLifecycleEntry(event: string, details?: string, metadata?: Record<string, unknown>) {
  return {
    at: new Date().toISOString(),
    details,
    event,
    metadata,
  };
}

export function appendLifecycleLog(
  message: ChatMessage,
  event: string,
  details?: string,
  metadata?: Record<string, unknown>,
): void {
  message.lifecycleLog = [...(message.lifecycleLog ?? []), createLifecycleEntry(event, details, metadata)];
}

export function classifyRuntimeError(error: Error): string {
  const message = error.message.trim();
  if (/spawn|enoent|shell/i.test(message)) {
    return `Erreur shell: ${message}`;
  }
  if (/policy/i.test(message)) {
    return `Commande refusee par la policy AEL: ${message}`;
  }
  return `Erreur Nova: ${message || "erreur inconnue."}`;
}
