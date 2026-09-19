import { AELCommandProgress } from "../../shared/chat.types";
import { RunningCommand } from "./ael.types";

export function detectInputRequest(output: string): { awaitingInput: boolean; inputPlaceholder?: string; inputSecret?: boolean } {
  const trimmed = output.trimEnd();

  if (/(?:password|mot de passe|passphrase)[^:\n\r]{0,60}:\s*$/i.test(trimmed)) {
    return {
      awaitingInput: true,
      inputPlaceholder: "Entrez le mot de passe",
      inputSecret: true,
    };
  }

  if (/[?:]\s*$/.test(trimmed)) {
    return {
      awaitingInput: true,
      inputPlaceholder: "Entrez la valeur demandee",
      inputSecret: false,
    };
  }

  return {
    awaitingInput: false,
  };
}

export function buildProgress(commandId: string, command: RunningCommand): AELCommandProgress {
  return {
    awaitingInput: command.awaitingInput,
    commandId,
    inputPlaceholder: command.inputPlaceholder,
    inputSecret: command.inputSecret,
    output: command.output.toString().trimEnd(),
  };
}
