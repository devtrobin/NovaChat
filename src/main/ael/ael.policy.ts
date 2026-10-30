import { parseCommand } from "./ael.command-parser";
import { evaluateSegment } from "./ael.policy.segment";
import {
  allow,
  AELCommandPermissionPolicy,
  mergePolicyDecisions,
} from "./ael.policy.types";
import { AELPolicyError } from "./ael.types";

export {
  AEL_RISK_CATEGORY_LABELS,
  AELCommandPermissionPolicy,
  AELCommandRiskCategory,
} from "./ael.policy.types";

export function normalizeCommand(command: string): string {
  return command.replace(/\r\n/g, "\n").trim();
}

export function assertCommandAllowed(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new AELPolicyError("La commande AEL est vide.");
  }
  if (/\0/.test(trimmed)) {
    throw new AELPolicyError("La commande AEL contient un caractere interdit.");
  }
}

export function evaluateCommandPermissionPolicy(
  command: string,
  allowedWriteRoots: string[],
): AELCommandPermissionPolicy {
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

  let finalDecision: AELCommandPermissionPolicy | null = null;
  for (const segment of parseResult.segments) {
    const decision = evaluateSegment(segment, allowedWriteRoots);
    finalDecision = mergePolicyDecisions(finalDecision, decision);
  }

  return finalDecision ?? allow("read-local", "Commande de lecture autorisee par la policy AEL.");
}
