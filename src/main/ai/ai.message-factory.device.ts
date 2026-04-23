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
    status: classifyDeviceResultStatus(result),
    to,
  };
}

function classifyDeviceResultStatus(result: DeviceCommandResult): ChatMessage["status"] {
  if (result.ok) {
    return "success";
  }

  if (hasPartialSuccessOutput(result.output)) {
    return "partial-success";
  }

  return "error";
}

function hasPartialSuccessOutput(output: string): boolean {
  const normalized = output.trim();
  if (!normalized) return false;

  const positiveSignals = [
    /Host is up/i,
    /Nmap scan report/i,
    /Network:/i,
    /IP\s+.*MAC/i,
    /Total:/i,
    /Available:/i,
    /free/i,
  ];
  if (positiveSignals.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const usefulLineCount = normalized
    .split("\n")
    .filter((line) => line.trim() && !/^(error|traceback|usage|command not found)/i.test(line.trim()))
    .length;
  return usefulLineCount >= 4;
}

export function createDeviceImmediateErrorMessage(
  command: string,
  id: string,
  error: unknown,
  to: "assistant" | "user" = "user",
): ChatMessage {
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
    to,
  };
}
