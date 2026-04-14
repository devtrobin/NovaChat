import { DevicePolicyError } from "./device.types";

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
