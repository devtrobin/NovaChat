import { parseCommand } from "./device.command-parser";
import { evaluateSegment } from "./device.policy.segment";
import {
  allow,
  DeviceCommandPermissionPolicy,
  mergePolicyDecisions,
} from "./device.policy.types";
import { DevicePolicyError } from "./device.types";

export {
  DEVICE_RISK_CATEGORY_LABELS,
  DeviceCommandPermissionPolicy,
  DeviceCommandRiskCategory,
} from "./device.policy.types";

export function normalizeCommand(command: string): string {
  return command.replace(/\r\n/g, "\n").trim();
}

export function assertCommandAllowed(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new DevicePolicyError("La commande device est vide.");
  }
  if (/\0/.test(trimmed)) {
    throw new DevicePolicyError("La commande device contient un caractere interdit.");
  }
}

export function evaluateCommandPermissionPolicy(
  command: string,
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const normalizedCommand = normalizeCommand(command);
  assertCommandAllowed(normalizedCommand);

  const parseResult = parseCommand(normalizedCommand);
  if (parseResult.kind === "unsafe") {
    return {
      category: "unclassified",
      kind: "ask-always",
      reason: parseResult.reason,
    };
  }

  let finalDecision: DeviceCommandPermissionPolicy | null = null;
  for (const segment of parseResult.segments) {
    const decision = evaluateSegment(segment, allowedWriteRoots);
    finalDecision = mergePolicyDecisions(finalDecision, decision);
  }

  return finalDecision ?? allow("read-local", "Commande de lecture autorisee par la policy device.");
}
