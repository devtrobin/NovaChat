import { parseCommand } from "./device.command-parser";
import { evaluateCommandPermissionPolicy } from "./device.policy";
import { findCommandToken } from "./device.policy.tokens";

const MAX_DEVICE_AGENT_SEGMENTS = 3;

const FORBIDDEN_DEVICE_AGENT_COMMANDS = new Set([
  "bash",
  "choice",
  "cmd",
  "cmd.exe",
  "control",
  "cscript",
  "diskmgmt",
  "diskpart",
  "dxdiag",
  "explorer",
  "htop",
  "less",
  "man",
  "mmc",
  "more",
  "msinfo32",
  "pause",
  "powershell",
  "powershell.exe",
  "pwsh",
  "regedit",
  "sh",
  "start",
  "sudo",
  "taskmgr",
  "top",
  "wmic",
  "wscript",
  "wt",
  "zsh",
]);

export type DeviceAgentCommandProfileDecision =
  | { kind: "allow" }
  | { kind: "reject"; reason: string };

export function evaluateDeviceAgentCommandProfile(
  command: string,
): DeviceAgentCommandProfileDecision {
  const parseResult = parseCommand(command);
  if (parseResult.kind === "unsafe") {
    return reject(
      `La syntaxe generee est trop complexe pour Device: ${parseResult.reason}`,
    );
  }
  if (parseResult.segments.length > MAX_DEVICE_AGENT_SEGMENTS) {
    return reject(
      `Device doit utiliser au plus ${MAX_DEVICE_AGENT_SEGMENTS} segments terminal par etape.`,
    );
  }

  for (const segment of parseResult.segments) {
    const commandToken = findCommandToken(segment.tokens);
    if (!commandToken) {
      return reject("Un segment ne contient aucune commande terminal identifiable.");
    }
    if (FORBIDDEN_DEVICE_AGENT_COMMANDS.has(commandToken.name)) {
      return reject(
        `La commande ${commandToken.name} est interactive, obsolete, ou peut ouvrir un autre programme.`,
      );
    }
  }

  const policyDecision = evaluateCommandPermissionPolicy(command, [process.cwd()]);
  if (
    policyDecision.kind === "ask-always"
    && policyDecision.category === "unclassified"
  ) {
    return reject(
      "La commande n'appartient pas au profil terminal analyse et approuve de Device.",
    );
  }

  return { kind: "allow" };
}

function reject(reason: string): DeviceAgentCommandProfileDecision {
  return { kind: "reject", reason };
}
