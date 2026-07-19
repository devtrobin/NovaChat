import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppSettings } from "../../../shared/settings.types";
import SettingsProviderSection from "./SettingsProviderSection";

describe("SettingsProviderSection", () => {
  it("shows planned providers but keeps them disabled", () => {
    const html = renderToStaticMarkup(
      <SettingsProviderSection
        isBusy={false}
        setDraft={vi.fn()}
        setStatus={vi.fn()}
        settings={createSettings()}
      />,
    );

    expect(html).toContain('<option value="openai" selected="">OpenAI</option>');
    expect(html).toContain('<option disabled="" value="anthropic">');
    expect(html).toContain('<option disabled="" value="ollama">');
    expect(html).toContain("seul provider activable");
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
