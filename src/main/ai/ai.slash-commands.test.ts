import { describe, expect, it } from "vitest";
import { ChatTurnEvent, RunTurnRequest } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import { createUserMessage } from "./ai.message-factory";
import { runSlashCommandTurn } from "./ai.orchestrator.slash-commands";
import {
  extractDirectCommand,
  isDirectCommand,
  isSlashCommand,
} from "./ai.orchestrator.runtime";
import {
  parseSlashCommand,
  resolveSlashCommandResponse,
  SLASH_COMMANDS,
} from "./ai.slash-commands";

const settings: AppSettings = {
  activeProvider: "openai",
  agents: {
    "agent-acp": { enabled: true },
    "agent-ael": { enabled: false },
  },
  apiTrace: {
    enabled: true,
    maxEntriesPerMessage: 50,
    redactSensitiveData: true,
    retentionDays: 30,
  },
  aelExecution: {
    maxOutputCharacters: 200_000,
    timeoutMs: 15_000,
  },
  hideInternalConversations: false,
  localFiles: {
    agentsDirectory: "agents",
    conversationsDirectory: "conversations",
    settingsPath: "settings.json",
  },
  openai: {
    apiKeyConfigured: true,
    baseUrl: "https://api.openai.com/v1",
    model: "test-model",
    provider: "openai",
  },
  previewMode: false,
};

describe("slash command registry", () => {
  it.each([
    ["/help", "help"],
    ["/AIDE", "help"],
    ["/commands", "help"],
    ["/?", "help"],
    ["/etat", "status"],
    ["/parametres", "settings"],
  ])("resolves %s to %s", (input, expectedName) => {
    expect(parseSlashCommand(input)?.definition?.name).toBe(expectedName);
  });

  it("keeps the direct shell command and its arguments intact", () => {
    expect(isDirectCommand("/cmd git status --short")).toBe(true);
    expect(extractDirectCommand("/cmd git status --short")).toBe("git status --short");
  });

  it("treats /cmd without an argument as local help instead of executing an empty command", () => {
    expect(isDirectCommand("/cmd")).toBe(false);
    expect(isSlashCommand("/cmd")).toBe(true);
    expect(resolve("/cmd").content).toContain("Syntaxe : /cmd <commande>");
  });

  it("lists every registered command in /help", () => {
    const content = resolve("/help").content;

    for (const command of SLASH_COMMANDS) {
      expect(content).toContain(command.usage);
    }
    expect(content).toContain("sans permission de l'agent AEL");
  });

  it("shows focused help for a command", () => {
    expect(resolve("/help status").content).toContain("Aide pour /status");
    expect(resolve("/help /cmd").content).toContain("shell local");
  });

  it("reports unknown commands without invoking another workflow", () => {
    expect(resolve("/does-not-exist").content).toBe(
      "Commande inconnue : /does-not-exist.\nTape /help pour afficher les commandes disponibles.",
    );
  });

  it("reports status without exposing the API key", () => {
    const content = resolve("/status").content;

    expect(content).toContain("OpenAI : prêt");
    expect(content).toContain("Modèle OpenAI : test-model");
    expect(content).toContain("Agent AEL : désactivé");
    expect(content).not.toContain("secret");
  });

  it("returns an actionable settings message", () => {
    expect(resolve("/settings")).toMatchObject({ openSettings: true });
  });
});

describe("slash command turn", () => {
  it("appends the user request and a local response", () => {
    const events: ChatTurnEvent[] = [];
    const request: RunTurnRequest = {
      conversationId: "conversation-1",
      messages: [],
      title: "Nouvelle conversation",
      userInput: "/help",
    };

    const result = runSlashCommandTurn(
      request,
      settings,
      createUserMessage(request.userInput),
      (event) => events.push(event),
    );

    expect(result).toEqual({ ok: true });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ title: "/help", type: "set-title" });
    expect(events[1]).toMatchObject({
      messages: [
        { content: "/help", from: "user" },
        { from: "assistant", to: "user" },
      ],
      type: "append-messages",
    });
  });

  it("adds the existing settings action to /settings", () => {
    const events: ChatTurnEvent[] = [];
    const request: RunTurnRequest = {
      conversationId: "conversation-1",
      messages: [createUserMessage("Message précédent")],
      title: "Conversation",
      userInput: "/settings",
    };

    runSlashCommandTurn(
      request,
      settings,
      createUserMessage(request.userInput),
      (event) => events.push(event),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      messages: [
        { content: "/settings", from: "user" },
        {
          actionLabel: "Ouvrir les paramètres",
          actionType: "open-settings",
          from: "system",
          status: "idle",
        },
      ],
      type: "append-messages",
    });
  });
});

function resolve(input: string) {
  const parsed = parseSlashCommand(input);
  if (!parsed) {
    throw new Error(`La commande de test est invalide : ${input}`);
  }
  return resolveSlashCommandResponse(parsed, settings);
}
