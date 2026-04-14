import { ChatMessage, DeviceCommandResult } from "../../renderer/types/chat.types";
import { DevicePolicyError } from "../device/device.types";
import { createLifecycleEntry } from "./ai.orchestrator.runtime";

export function createRunningDeviceMessage(
  command: string,
  commandId: string,
  from: "assistant" | "user" = "assistant",
  to: "device" = "device",
): ChatMessage {
  return {
    apiRequests: [],
    commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from,
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [createLifecycleEntry("created", "Message device cree.")],
    result: "",
    status: "running",
    to,
  };
}

export function createDeviceResultMessage(
  command: string,
  id: string,
  result: DeviceCommandResult,
  previousMessage?: ChatMessage,
  from: "device" = "device",
  to: "assistant" | "user" = "assistant",
): ChatMessage {
  return {
    apiRequests: [],
    commandId: result.commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from,
    id,
    isExpandable: true,
    lifecycleLog: [
      ...(previousMessage?.lifecycleLog ?? []),
      createLifecycleEntry("created", "Resultat device cree."),
    ],
    result: result.output,
    status: result.ok ? "success" : "error",
    to,
  };
}

export function createDeviceImmediateErrorMessage(command: string, id: string, error: unknown): ChatMessage {
  const displayMessage = error instanceof DevicePolicyError
    ? `Commande refusee par la policy device: ${error.message}`
    : error instanceof Error
      ? error.message.trim().match(/spawn|enoent|shell/i)
        ? `Erreur shell: ${error.message.trim()}`
        : `Erreur Nova: ${error.message.trim() || "erreur inconnue."}`
      : "Erreur shell: impossible d'executer la commande.";

  return {
    apiRequests: [],
    content: command,
    createdAt: new Date().toISOString(),
    from: "device",
    id,
    isExpandable: true,
    lifecycleLog: [
      createLifecycleEntry("created", "Resultat device cree."),
      createLifecycleEntry("device-finished", "La commande n'a pas pu demarrer.", {
        errorType: error instanceof DevicePolicyError ? "policy" : "shell",
      }),
    ],
    result: displayMessage,
    status: "error",
    to: "user",
  };
}
