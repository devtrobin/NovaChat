import { ChatMessage } from "../../shared/chat.types";

export const MAX_ASSISTANT_CYCLES = 8;
export const MAX_DEVICE_EXECUTIONS = 6;

export type OrchestrationBudget = {
  deviceExecutions: number;
  executedDeviceCommands: Set<string>;
};

export type BudgetDecision = {
  duplicateCommand: boolean;
  deviceLimitReached: boolean;
};

export function createOrchestrationBudget(): OrchestrationBudget {
  return {
    deviceExecutions: 0,
    executedDeviceCommands: new Set<string>(),
  };
}

export function registerDeviceResult(
  budget: OrchestrationBudget,
  message: ChatMessage,
): BudgetDecision {
  if (message.agentId !== "device-agent") {
    return {
      duplicateCommand: false,
      deviceLimitReached: false,
    };
  }

  budget.deviceExecutions += 1;
  const signature = extractDeviceCommand(message);
  const duplicateCommand = Boolean(signature && budget.executedDeviceCommands.has(signature));
  if (signature) budget.executedDeviceCommands.add(signature);

  return {
    duplicateCommand,
    deviceLimitReached: budget.deviceExecutions >= MAX_DEVICE_EXECUTIONS,
  };
}

function extractDeviceCommand(message: ChatMessage): string | null {
  for (const entry of message.lifecycleLog ?? []) {
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
