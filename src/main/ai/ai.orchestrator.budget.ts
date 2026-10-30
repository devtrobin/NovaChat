import { ChatMessage } from "../../shared/chat.types";

export const MAX_ASSISTANT_CYCLES = 8;
export const MAX_AEL_EXECUTIONS = 6;

export type OrchestrationBudget = {
  aelExecutions: number;
  executedAELCommands: Set<string>;
};

export type BudgetDecision = {
  duplicateCommand: boolean;
  aelLimitReached: boolean;
};

export function createOrchestrationBudget(): OrchestrationBudget {
  return {
    aelExecutions: 0,
    executedAELCommands: new Set<string>(),
  };
}

export function registerAELResult(
  budget: OrchestrationBudget,
  message: ChatMessage,
): BudgetDecision {
  if (message.agentId !== "agent-ael") {
    return {
      duplicateCommand: false,
      aelLimitReached: false,
    };
  }

  budget.aelExecutions += 1;
  const signature = extractAELCommand(message);
  const duplicateCommand = Boolean(signature && budget.executedAELCommands.has(signature));
  if (signature) budget.executedAELCommands.add(signature);

  return {
    duplicateCommand,
    aelLimitReached: budget.aelExecutions >= MAX_AEL_EXECUTIONS,
  };
}

function extractAELCommand(message: ChatMessage): string | null {
  for (const entry of message.lifecycleLog ?? []) {
    if (entry.metadata?.action === "write-file" && typeof entry.metadata.actionSignature === "string") {
      return `write-file:${entry.metadata.actionSignature}`;
    }
    const command = entry.metadata?.command;
    if (typeof command === "string" && command.trim()) {
      return normalizeCommandSignature(command);
    }
  }

  const technicalCommand = message.result?.match(/(?:^|\n)Commande:\s*([^\n]+)/i)?.[1];
  return technicalCommand?.trim()
    ? normalizeCommandSignature(technicalCommand)
    : null;
}

function normalizeCommandSignature(command: string): string {
  return command.trim().toLowerCase().replace(/\s+/g, " ");
}
