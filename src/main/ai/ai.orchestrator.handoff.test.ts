import { describe, expect, it } from "vitest";
import { AppSettings } from "../../shared/settings.types";
import { resolveAgentHandoff } from "./ai.orchestrator.handoff";
import {
  getEnabledAgents,
  shouldForceACPAgentHandoff,
} from "./ai.orchestrator.acp-handoff";

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

describe("assistant handoff resolution", () => {
  it("turns an explicit AEL goal into goal mode", () => {
    expect(resolveAgentHandoff({
      apiRecords: [],
      providerResponse: {
        content: "GOAL: inspecter le depot",
        from: "assistant",
        to: "ael",
      },
    })).toMatchObject({
      agentId: "agent-ael",
      mode: "goal",
      previewContent: "GOAL: inspecter le depot",
      request: "inspecter le depot",
    });
  });

  it("keeps a shell command in command mode", () => {
    expect(resolveAgentHandoff({
      apiRecords: [],
      providerResponse: {
        content: "rg --files",
        from: "assistant",
        to: "ael",
      },
    })).toMatchObject({
      agentId: "agent-ael",
      mode: "command",
      request: "rg --files",
    });
  });

  it("keeps ACP delegations in analysis mode", () => {
    expect(resolveAgentHandoff({
      apiRecords: [],
      providerResponse: {
        agentId: "agent-acp",
        content: "Analyse la demande",
        from: "assistant",
        to: "agent",
      },
    })).toMatchObject({
      agentId: "agent-acp",
      mode: "analysis",
    });
  });
});

describe("forced ACP handoff", () => {
  it("forces the first non-trivial request when ACP has not run", () => {
    expect(shouldForceACPAgentHandoff(
      settings,
      0,
      [],
      "Analyse ce probleme et propose un plan fiable",
      "Je vais examiner le probleme.",
    )).toBe(true);
  });

  it("does not force ACP after the first cycle", () => {
    expect(shouldForceACPAgentHandoff(
      settings,
      1,
      [],
      "Analyse ce probleme",
      "Je poursuis.",
    )).toBe(false);
  });

  it("returns only enabled agents to the provider", () => {
    expect(getEnabledAgents(settings)).toEqual(["agent-acp"]);
  });
});
