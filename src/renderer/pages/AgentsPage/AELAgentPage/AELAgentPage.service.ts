import { AgentHistoryEntry } from "../../../../shared/agent.types";

export function formatRecordDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}

export function getHistoryStatusLabel(status: AgentHistoryEntry["status"]): string {
  if (status === "success") return "Succes";
  if (status === "partial-success") return "Partiel";
  if (status === "denied") return "Refus";
  return "Erreur";
}

export function truncateRecordOutput(value: string): string {
  return value.length > 900
    ? `${value.slice(0, 900)}\n\n[sortie tronquee: ${value.length - 900} caracteres masques]`
    : value;
}
