import {
  allow,
  ask,
  DeviceCommandPermissionPolicy,
} from "./device.policy.types";

const CONTENT_READING_COMMANDS = new Set([
  "cat",
  "diff",
  "fc",
  "findstr",
  "grep",
  "head",
  "more",
  "rg",
  "sort",
  "tail",
  "type",
]);

const SAFE_ENVIRONMENT_NAMES = new Set([
  "comspec",
  "number_of_processors",
  "os",
  "processor_architecture",
  "processor_identifier",
  "processor_level",
  "processor_revision",
]);

export function evaluateSensitiveRead(
  commandName: string,
  tokens: string[],
): DeviceCommandPermissionPolicy | null {
  if (commandName === "env" && tokens.length === 1) {
    return ask("read-local", "L'environnement complet peut contenir des secrets.");
  }
  if (commandName === "printenv") {
    const requestedNames = tokens.slice(1).map((token) => token.toLowerCase());
    return requestedNames.length > 0
      && requestedNames.every((name) => SAFE_ENVIRONMENT_NAMES.has(name))
      ? allow("read-local", "Lecture d'une variable d'environnement systeme non sensible.")
      : ask("read-local", "Les variables d'environnement demandees peuvent contenir des secrets.");
  }
  if (!CONTENT_READING_COMMANDS.has(commandName)) return null;

  return tokens.slice(1).some(isSensitiveReadTarget)
    ? ask("read-local", "La commande peut lire un fichier contenant des secrets.")
    : null;
}

function isSensitiveReadTarget(value: string): boolean {
  if (!value || value.startsWith("-")) return false;
  if (process.platform === "win32" && /^\/[a-z?]+(?::.*)?$/i.test(value)) return false;
  const normalized = value.toLowerCase().replace(/\\/g, "/");
  const basename = normalized.split("/").pop() ?? normalized;

  return /(^|\/)(?:\.aws|\.ssh|secrets?)(?:\/|$)/.test(normalized)
    || /^\.env(?:\.|$)/.test(basename)
    || /^(?:credentials|openai-api-key|secrets?)(?:\.[^.]+)*$/.test(basename)
    || /^(?:id_dsa|id_ecdsa|id_ed25519|id_rsa)$/.test(basename)
    || /\.(?:key|p12|pem|pfx)$/.test(basename)
    || /^settings\.json\.(?:bak|backup)$/.test(basename);
}
