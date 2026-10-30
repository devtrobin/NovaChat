import { AppSettings } from "../../shared/settings.types";

export type SlashCommandName = "agents" | "cmd" | "help" | "settings" | "status";

export type SlashCommandDefinition = {
  aliases: readonly string[];
  description: string;
  name: SlashCommandName;
  usage: string;
};

export type ParsedSlashCommand = {
  args: string;
  definition: SlashCommandDefinition | null;
  invokedAs: string;
};

export type SlashCommandResponse = {
  content: string;
  openSettings?: boolean;
};

export const SLASH_COMMANDS: readonly SlashCommandDefinition[] = [
  {
    aliases: ["aide", "commands", "?"],
    description: "Affiche toutes les commandes ou l'aide d'une commande.",
    name: "help",
    usage: "/help [commande]",
  },
  {
    aliases: ["etat"],
    description: "Affiche la configuration active sans révéler les secrets.",
    name: "status",
    usage: "/status",
  },
  {
    aliases: [],
    description: "Affiche les agents disponibles et leur état.",
    name: "agents",
    usage: "/agents",
  },
  {
    aliases: ["parametres"],
    description: "Propose un accès direct aux paramètres.",
    name: "settings",
    usage: "/settings",
  },
  {
    aliases: [],
    description: "Exécute explicitement une commande dans le shell local.",
    name: "cmd",
    usage: "/cmd <commande>",
  },
];

export function parseSlashCommand(input: string): ParsedSlashCommand | null {
  const match = input.trim().match(/^\/([^\s/]+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return null;
  }

  const invokedAs = match[1].toLowerCase();
  return {
    args: (match[2] ?? "").trim(),
    definition: findSlashCommand(invokedAs),
    invokedAs,
  };
}

export function resolveSlashCommandResponse(
  parsed: ParsedSlashCommand,
  settings: AppSettings,
): SlashCommandResponse {
  if (!parsed.definition) {
    return {
      content: `Commande inconnue : /${parsed.invokedAs}.\nTape /help pour afficher les commandes disponibles.`,
    };
  }

  switch (parsed.definition.name) {
    case "agents":
      return { content: formatAgents(settings) };
    case "help":
      return { content: formatHelp(parsed.args) };
    case "settings":
      return {
        content: "Les paramètres permettent de configurer OpenAI, les agents et les fichiers locaux.",
        openSettings: true,
      };
    case "status":
      return { content: formatStatus(settings) };
    case "cmd":
      return { content: formatCommandHelp(findSlashCommand("cmd") as SlashCommandDefinition) };
  }
}

function findSlashCommand(value: string): SlashCommandDefinition | null {
  const normalized = value.replace(/^\//, "").trim().toLowerCase();
  return SLASH_COMMANDS.find((command) => (
    command.name === normalized || command.aliases.includes(normalized)
  )) ?? null;
}

function formatHelp(requestedCommand: string): string {
  if (requestedCommand) {
    const definition = findSlashCommand(requestedCommand.split(/\s+/, 1)[0]);
    return definition
      ? formatCommandHelp(definition)
      : `Commande inconnue : ${formatCommandToken(requestedCommand)}.\nTape /help pour afficher les commandes disponibles.`;
  }

  const commands = SLASH_COMMANDS.map((command) => `${command.usage} — ${command.description}`);
  return [
    "Commandes NovaChat disponibles :",
    "",
    ...commands,
    "",
    "Alias : /aide, /commands et /? ouvrent cette aide ; /etat et /parametres sont aussi acceptés.",
    "",
    "Attention : /cmd exécute directement la commande demandée dans le shell local, sans permission de l'agent AEL.",
  ].join("\n");
}

function formatCommandHelp(definition: SlashCommandDefinition): string {
  const aliases = definition.aliases.length
    ? `Alias : ${definition.aliases.map((alias) => `/${alias}`).join(", ")}`
    : "";
  const warning = definition.name === "cmd"
    ? "Attention : cette commande utilise directement le shell local et ne passe pas par les permissions de l'agent AEL."
    : "";

  return [
    `Aide pour /${definition.name}`,
    `Syntaxe : ${definition.usage}`,
    definition.description,
    aliases,
    warning,
  ].filter(Boolean).join("\n");
}

function formatStatus(settings: AppSettings): string {
  const openAIReady = Boolean(settings.openai.apiKeyConfigured && settings.openai.model.trim());

  return [
    "État de NovaChat :",
    "",
    `- Provider sélectionné : ${settings.activeProvider}`,
    `- OpenAI : ${openAIReady ? "prêt" : "configuration incomplète"}`,
    `- Modèle OpenAI : ${settings.openai.model.trim() || "non configuré"}`,
    `- Agent ACP : ${formatEnabled(settings.agents["agent-acp"].enabled)}`,
    `- Agent AEL : ${formatEnabled(settings.agents["agent-ael"].enabled)}`,
    `- Mode aperçu : ${settings.previewMode ? "activé" : "désactivé"}`,
  ].join("\n");
}

function formatAgents(settings: AppSettings): string {
  return [
    "Agents NovaChat :",
    "",
    `- ACP — ${formatEnabled(settings.agents["agent-acp"].enabled)} : prépare la prochaine étape atomique.`,
    `- AEL — ${formatEnabled(settings.agents["agent-ael"].enabled)} : exécute une commande locale avec le workflow de permission.`,
    "",
    "Nova sélectionne les agents automatiquement selon la demande.",
  ].join("\n");
}

function formatEnabled(enabled: boolean): string {
  return enabled ? "activé" : "désactivé";
}

function formatCommandToken(value: string): string {
  const command = value.trim().replace(/^\//, "").split(/\s+/, 1)[0];
  return `/${command}`;
}
