export type SystemAgentDefinition = {
  acronym: string;
  capabilities: readonly string[];
  context: string;
  defaultContext: {
    description: string;
    instructions: string;
    name: string;
  };
  defaultEnabled: boolean;
  description: string;
  features: readonly string[];
  fullName: string;
  id: string;
  mission: string;
  processes: readonly string[];
  tools: readonly string[];
};

export const SYSTEM_AGENT_DEFINITIONS = {
  "agent-acp": {
    acronym: "ACP",
    capabilities: [
      "task-planning",
      "atomic-step-design",
      "agent-routing",
    ],
    context: "Agent specialise dans la planification des demandes Nova et le decoupage en actions atomiques.",
    defaultContext: {
      description: "Planification des demandes Nova et decoupage en prochaines etapes atomiques.",
      instructions:
        "Decompose la demande en une prochaine action atomique, tiens compte des resultats deja obtenus et indique clairement le critere de reussite. Signale les actions actives ou intrusives sans inventer de demande de permission.",
      name: "ACP",
    },
    defaultEnabled: true,
    description: "Planification, routage agent et prochaine etape atomique.",
    features: [
      "decoupage des demandes",
      "selection d'agent recommande",
      "resume JSON et debug",
    ],
    fullName: "Agent de Cadrage et de Planification",
    id: "agent-acp",
    mission: "Transformer une demande non triviale en prochaine action atomique pour Nova, sans executer lui-meme les actions.",
    processes: [
      "analyse la demande courante",
      "identifie les informations manquantes",
      "propose une prochaine action atomique",
      "recommande l'agent a appeler",
    ],
    tools: [
      "agent.context",
      "acp.next-step",
    ],
  },
  "agent-ael": {
    acronym: "AEL",
    capabilities: [
      "shell-execution",
      "file-creation",
      "interactive-input",
      "permission-checking",
      "execution-history",
    ],
    context: "Agent specialise dans l'execution locale, l'analyse machine et les interactions terminales.",
    defaultContext: {
      description: "Execution des commandes et interactions AEL.",
      instructions:
        "Utilise uniquement des commandes terminal natives, courtes et non interactives. N'ouvre jamais de fenetre, de console secondaire ni d'utilitaire interactif. Retourne a Nova apres chaque inspection ciblee.",
      name: "AEL",
    },
    defaultEnabled: true,
    description: "Execution des commandes et interactions AEL.",
    features: [
      "execution de commandes",
      "creation de fichiers avec permission et verification",
      "saisie interactive",
      "journalisation locale",
      "diagnostic terminal",
    ],
    fullName: "Agent d'Execution Locale",
    id: "agent-ael",
    mission: "Executer des commandes locales, verifier les permissions et remonter un resultat exploitable a l'assistant principal.",
    processes: [
      "prepare une action terminale",
      "execute la commande dans le terminal local",
      "collecte la sortie et les erreurs",
      "remonte un resultat exploitable",
    ],
    tools: [
      "ael.run",
      "ael.write-file",
      "ael.kill",
      "ael.input",
    ],
  },
} as const satisfies Record<string, SystemAgentDefinition>;

export type SystemAgentId = keyof typeof SYSTEM_AGENT_DEFINITIONS;

export const SYSTEM_AGENT_IDS = Object.freeze(
  Object.keys(SYSTEM_AGENT_DEFINITIONS) as SystemAgentId[],
);

export function getSystemAgentDefinition(agentId: SystemAgentId) {
  return SYSTEM_AGENT_DEFINITIONS[agentId];
}
