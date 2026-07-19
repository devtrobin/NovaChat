import { ChatMessage } from "../../shared/chat.types";
import { AgentTaskRequest } from "../../shared/agent.types";

export type DeviceAgentOutcomeStatus = "denied" | "error" | "partial-success" | "success";

export function createAgentResultMessage(
  agentId: AgentTaskRequest["agentId"],
  content: string,
): ChatMessage {
  const createdAt = new Date().toISOString();
  return {
    agentId,
    apiRequests: [],
    content,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Resultat ${agentId} -> assistant cree.`,
        event: "created",
      },
    ],
    status: "success",
    to: "assistant",
    visibility: "internal",
  };
}

export function createDeviceAgentSummaryMessage(
  taskRequest: string,
  command: string,
  output: string,
  status: DeviceAgentOutcomeStatus,
): ChatMessage {
  const createdAt = new Date().toISOString();
  const summary = summarizeDeviceOutput(output, status);

  return {
    agentId: "device-agent",
    apiRequests: [],
    content: summary,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [
      {
        at: createdAt,
        details: "Reponse device-agent -> assistant creee.",
        event: "created",
        metadata: { command, status },
      },
    ],
    result: formatDeviceAgentTechnicalDetails(taskRequest, command, output, status),
    status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
    to: "assistant",
    visibility: "internal",
  };
}

export function extractDeviceAgentSummaryOutput(message: ChatMessage): string {
  const lines = (message.result ?? message.content).split("\n");
  const resultLine = lines.find((line) => /^Resultat: |^Motif: |^Erreur: /i.test(line));
  return resultLine ? resultLine.replace(/^[^:]+:\s*/i, "") : message.content;
}

export function normalizeDeviceStatus(
  status?: ChatMessage["status"],
): "error" | "partial-success" | "success" {
  if (status === "success") return "success";
  if (status === "partial-success") return "partial-success";
  return "error";
}

function formatDeviceAgentTechnicalDetails(
  taskRequest: string,
  command: string,
  output: string,
  status: DeviceAgentOutcomeStatus,
): string {
  if (status === "success") {
    return [
      "Execution terminee.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Resultat: ${output}`,
    ].join("\n");
  }

  if (status === "partial-success") {
    return [
      "Execution partiellement reussie.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Resultat partiel: ${output}`,
    ].join("\n");
  }

  if (status === "denied") {
    return [
      "Execution non autorisee.",
      `Objectif: ${taskRequest}`,
      `Commande: ${command}`,
      `Motif: ${output}`,
    ].join("\n");
  }

  return [
    "Execution echouee.",
    `Objectif: ${taskRequest}`,
    `Commande: ${command}`,
    `Erreur: ${output}`,
  ].join("\n");
}

function summarizeDeviceOutput(
  output: string,
  status: DeviceAgentOutcomeStatus,
): string {
  const cleaned = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^Journal:/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (status === "success") {
    return cleaned || "Execution terminee.";
  }

  if (status === "partial-success") {
    return cleaned || "Execution partiellement reussie.";
  }

  if (status === "denied") {
    return cleaned || "Execution non autorisee.";
  }

  return cleaned || "Execution echouee.";
}
