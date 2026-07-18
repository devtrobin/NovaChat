import { describe, expect, it } from "vitest";
import { AppSettings } from "../../shared/settings.types";
import { resolveAgentHandoff } from "./ai.orchestrator.handoff";
import {
  getEnabledAgents,
  shouldForcePlannerAgentHandoff,
} from "./ai.orchestrator.planner-handoff";

const settings: AppSettings = {
  activeProvider: "openai",
  agents: {
    "agent-planner": { enabled: true },
    "device-agent": { enabled: false },
  },
  apiTrace: {
    enabled: true,
    maxEntriesPerMessage: 50,
    redactSensitiveData: true,
    retentionDays: 30,
  },
  deviceExecution: {
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
  it("turns an explicit Device goal into goal mode", () => {
    expect(resolveAgentHandoff({
      apiRecords: [],
      providerResponse: {
        content: "GOAL: inspecter le depot",
        from: "assistant",
        to: "device",
      },
    })).toMatchObject({
      agentId: "device-agent",
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
        to: "device",
      },
    })).toMatchObject({
      agentId: "device-agent",
      mode: "command",
      request: "rg --files",
    });
  });

  it("keeps Planner delegations in analysis mode", () => {
    expect(resolveAgentHandoff({
      apiRecords: [],
      providerResponse: {
        agentId: "agent-planner",
        content: "Analyse la demande",
        from: "assistant",
        to: "agent",
      },
    })).toMatchObject({
      agentId: "agent-planner",
      mode: "analysis",
    });
  });
});

describe("forced Planner handoff", () => {
  it("forces the first non-trivial request when Planner has not run", () => {
    expect(shouldForcePlannerAgentHandoff(
      settings,
      0,
      [],
      "Analyse ce probleme et propose un plan fiable",
      "Je vais examiner le probleme.",
    )).toBe(true);
  });

  it("does not force Planner after the first cycle", () => {
    expect(shouldForcePlannerAgentHandoff(
      settings,
      1,
      [],
      "Analyse ce probleme",
      "Je poursuis.",
    )).toBe(false);
  });

  it("returns only enabled agents to the provider", () => {
    expect(getEnabledAgents(settings)).toEqual(["agent-planner"]);
  });
});
