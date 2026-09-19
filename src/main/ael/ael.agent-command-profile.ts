import { parseCommand } from "./ael.command-parser";
import { evaluateCommandPermissionPolicy } from "./ael.policy";
import { findCommandToken } from "./ael.policy.tokens";

const MAX_AEL_AGENT_SEGMENTS = 3;

const FORBIDDEN_AEL_AGENT_COMMANDS = new Set([
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

export type AELAgentCommandProfileDecision =
  | { kind: "allow" }
  | { kind: "reject"; reason: string };

export function evaluateAELAgentCommandProfile(
  command: string,
): AELAgentCommandProfileDecision {
  const parseResult = parseCommand(command);
  if (parseResult.kind === "unsafe") {
    return reject(
      `La syntaxe generee est trop complexe pour AEL: ${parseResult.reason}`,
    );
  }
  if (parseResult.segments.length > MAX_AEL_AGENT_SEGMENTS) {
    return reject(
      `AEL doit utiliser au plus ${MAX_AEL_AGENT_SEGMENTS} segments terminal par etape.`,
    );
  }

  for (const segment of parseResult.segments) {
    const commandToken = findCommandToken(segment.tokens);
    if (!commandToken) {
      return reject("Un segment ne contient aucune commande terminal identifiable.");
    }
    if (FORBIDDEN_AEL_AGENT_COMMANDS.has(commandToken.name)) {
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
      "La commande n'appartient pas au profil terminal analyse et approuve de AEL.",
    );
  }

  return { kind: "allow" };
}

function reject(reason: string): AELAgentCommandProfileDecision {
  return { kind: "reject", reason };
}
