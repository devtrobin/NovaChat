import { describe, expect, it } from "vitest";
import { AppSettings } from "../../../shared/settings.types";
import { validateSettingsDraft } from "./SettingsPanel.service";

describe("settings draft validation", () => {
  it("requires every local storage location without requiring OpenAI", () => {
    const settings = createSettings();
    settings.localFiles.agentsDirectory = " ";
    settings.openai.apiKeyConfigured = false;
    settings.openai.model = "";

    expect(validateSettingsDraft(settings, "local-files"))
      .toBe("Le dossier des agents est requis.");
  });

  it("keeps network credentials in the OpenAI-specific validation", () => {
    const settings = createSettings();

    expect(validateSettingsDraft(settings, "local-files")).toBeNull();
    expect(validateSettingsDraft(settings, "openai"))
      .toBe("La cle API OpenAI est requise.");
  });
});

function createSettings(): AppSettings {
  return {
    activeProvider: "openai",
    agents: {
      "agent-planner": { enabled: true },
      "device-agent": { enabled: true },
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
      apiKeyConfigured: false,
      baseUrl: "https://api.openai.com/v1",
      model: "",
      provider: "openai",
    },
    previewMode: false,
  };
}
