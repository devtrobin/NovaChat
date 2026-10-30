import { ChatMessage, AELCommandResult } from "../../shared/chat.types";
import { AELPolicyError } from "../ael/ael.types";
import { createLifecycleEntry } from "./ai.orchestrator.runtime";

export function createRunningAELMessage(
  command: string,
  commandId: string,
  from: "assistant" | "user" = "assistant",
  to: "ael" = "ael",
): ChatMessage {
  return {
    apiRequests: [],
    commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from,
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [createLifecycleEntry("created", "Message ael cree.")],
    result: "",
    status: "running",
    to,
    visibility: from === "user" ? "public" : "internal",
  };
}

export function createAELResultMessage(
  command: string,
  id: string,
  result: AELCommandResult,
  previousMessage?: ChatMessage,
  from: "ael" = "ael",
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
      createLifecycleEntry("created", "Resultat ael cree."),
    ],
    result: result.output,
    status: classifyAELResultStatus(result),
    to,
    visibility: to === "user" ? "public" : "internal",
  };
}

function classifyAELResultStatus(result: AELCommandResult): ChatMessage["status"] {
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

export function createAELImmediateErrorMessage(
  command: string,
  id: string,
  error: unknown,
  to: "assistant" | "user" = "user",
): ChatMessage {
  const displayMessage = error instanceof AELPolicyError
    ? `Commande refusee par la policy AEL: ${error.message}`
    : error instanceof Error
      ? error.message.trim().match(/spawn|enoent|shell/i)
        ? `Erreur shell: ${error.message.trim()}`
        : `Erreur Nova: ${error.message.trim() || "erreur inconnue."}`
      : "Erreur shell: impossible d'executer la commande.";

  return {
    apiRequests: [],
    content: command,
    createdAt: new Date().toISOString(),
    from: "ael",
    id,
    isExpandable: true,
    lifecycleLog: [
      createLifecycleEntry("created", "Resultat ael cree."),
      createLifecycleEntry("ael-finished", "La commande n'a pas pu demarrer.", {
        errorType: error instanceof AELPolicyError ? "policy" : "shell",
      }),
    ],
    result: displayMessage,
    status: "error",
    to,
    visibility: to === "user" ? "public" : "internal",
  };
}
