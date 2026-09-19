import { ChatMessage } from "../../shared/chat.types";
import { AgentTaskRequest } from "../../shared/agent.types";

export type AELAgentOutcomeStatus = "denied" | "error" | "partial-success" | "success";

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

export function createAELAgentSummaryMessage(
  taskRequest: string,
  command: string,
  output: string,
  status: AELAgentOutcomeStatus,
): ChatMessage {
  const createdAt = new Date().toISOString();
  const summary = summarizeAELOutput(output, status);

  return {
    agentId: "agent-ael",
    apiRequests: [],
    content: summary,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [
      {
        at: createdAt,
        details: "Reponse agent-ael -> assistant creee.",
        event: "created",
        metadata: { command, status },
      },
    ],
    result: formatAELAgentTechnicalDetails(taskRequest, command, output, status),
    status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
    to: "assistant",
    visibility: "internal",
  };
}

export function extractAELAgentSummaryOutput(message: ChatMessage): string {
  const lines = (message.result ?? message.content).split("\n");
  const resultLine = lines.find((line) => /^Resultat: |^Motif: |^Erreur: /i.test(line));
  return resultLine ? resultLine.replace(/^[^:]+:\s*/i, "") : message.content;
}

export function normalizeAELStatus(
  status?: ChatMessage["status"],
): "error" | "partial-success" | "success" {
  if (status === "success") return "success";
  if (status === "partial-success") return "partial-success";
  return "error";
}

function formatAELAgentTechnicalDetails(
  taskRequest: string,
  command: string,
  output: string,
  status: AELAgentOutcomeStatus,
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

function summarizeAELOutput(
  output: string,
  status: AELAgentOutcomeStatus,
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
