import { app } from "electron";
import path from "node:path";
import {
  AgentSettingsMap,
  AppSettings,
  RuntimeAppSettings,
} from "../../shared/settings.types";
import { parseAppSettings } from "../validation/ipc-payload.validation";
import { getOpenAICredentialStore } from "../credentials/electron-credential.service";
import {
  createStorageIssue,
  readJsonFileDetailed,
  writeJsonFile,
} from "../chat/chat-storage.io";
import { reportStorageIssue } from "../storage/storage-journal";

function getApplicationDirectory(): string {
  return app.isPackaged ? path.dirname(process.execPath) : process.cwd();
}

export function getLegacyApplicationDirectory(): string {
  return getApplicationDirectory();
}

export function getUserDataDirectory(): string {
  return app.getPath("userData");
}

export function getReferenceSettingsPath(): string {
  return path.join(getUserDataDirectory(), "settings.json");
}

export function getReferenceConversationsPath(): string {
  return path.join(getUserDataDirectory(), "conversations.json");
}

export function getReferenceConversationsDirectory(): string {
  return path.join(getUserDataDirectory(), "conversations");
}

export function getReferenceAgentsDirectory(): string {
  return path.join(getUserDataDirectory(), "agents");
}

export function createDefaultSettings(): AppSettings {
  return parseAppSettings({
    activeProvider: "openai",
    agents: createDefaultAgentSettings(),
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
      agentsDirectory: getReferenceAgentsDirectory(),
      conversationsDirectory: getReferenceConversationsDirectory(),
      settingsPath: getReferenceSettingsPath(),
    },
    openai: {
      apiKeyConfigured: false,
      baseUrl: "https://api.openai.com/v1",
      model: "",
      provider: "openai",
    },
    previewMode: false,
  });
}

function createDefaultAgentSettings(): AgentSettingsMap {
  return {
    "agent-planner": { enabled: true },
    "device-agent": { enabled: true },
  };
}

function mergeSettings(partial: unknown): AppSettings {
  const defaults = createDefaultSettings();
  const parsed = (partial ?? {}) as Partial<AppSettings>;

  return parseAppSettings({
    ...defaults,
    ...parsed,
    activeProvider: parsed.activeProvider === "openai"
      ? parsed.activeProvider
      : defaults.activeProvider,
    agents: {
      ...defaults.agents,
      ...parsed.agents,
      "agent-planner": {
        ...defaults.agents["agent-planner"],
        ...parsed.agents?.["agent-planner"],
        ...((parsed.agents as Partial<Record<"diagnostic-agent", { enabled: boolean }>> | undefined)?.["diagnostic-agent"] ?? {}),
      },
      "device-agent": {
        ...defaults.agents["device-agent"],
        ...parsed.agents?.["device-agent"],
      },
    },
    apiTrace: {
      ...defaults.apiTrace,
      ...parsed.apiTrace,
    },
    deviceExecution: {
      ...defaults.deviceExecution,
      ...parsed.deviceExecution,
    },
    localFiles: {
      ...defaults.localFiles,
      ...parsed.localFiles,
    },
    openai: {
      ...defaults.openai,
      ...parsed.openai,
    },
  });
}

async function readSettingsFile(filePath: string): Promise<AppSettings | null> {
  const result = await readJsonFileDetailed<unknown>(filePath);
  if (!result.value) return null;
  try {
    return mergeSettings(result.value);
  } catch (error) {
    reportStorageIssue(createStorageIssue(
      filePath,
      "invalid-json",
      error instanceof Error ? error.message : "Schema de settings invalide.",
    ));
    return null;
  }
}

async function loadSettingsMetadataFromDisk(): Promise<AppSettings> {
  const referenceSettings = await readSettingsFile(getReferenceSettingsPath());
  const fallbackSettings = referenceSettings ?? createDefaultSettings();
  const configuredSettingsPath = fallbackSettings.localFiles.settingsPath;

  if (!configuredSettingsPath || configuredSettingsPath === getReferenceSettingsPath()) {
    return fallbackSettings;
  }

  const configuredSettings = await readSettingsFile(configuredSettingsPath);
  return configuredSettings ?? fallbackSettings;
}

export async function loadSettingsFromDisk(): Promise<AppSettings> {
  const settings = await loadSettingsMetadataFromDisk();
  return {
    ...settings,
    openai: {
      ...settings.openai,
      apiKeyConfigured: await getOpenAICredentialStore().has(),
      apiKeyUpdate: undefined,
    },
  };
}

export async function loadRuntimeSettingsFromDisk(): Promise<RuntimeAppSettings> {
  const settings = await loadSettingsFromDisk();
  const apiKey = await getOpenAICredentialStore().get();
  return {
    ...settings,
    openai: {
      ...settings.openai,
      apiKey,
    },
  };
}

export async function saveSettingsToDisk(settings: AppSettings): Promise<AppSettings> {
  const credentialStore = getOpenAICredentialStore();
  if (settings.openai.apiKeyUpdate?.trim()) {
    await credentialStore.set(settings.openai.apiKeyUpdate);
  }
  const normalizedSettings = mergeSettings({
    ...settings,
    openai: {
      ...settings.openai,
      apiKeyConfigured: await credentialStore.has(),
      apiKeyUpdate: undefined,
    },
  });
  await writeJsonFile(getReferenceSettingsPath(), normalizedSettings);

  if (normalizedSettings.localFiles.settingsPath !== getReferenceSettingsPath()) {
    await writeJsonFile(normalizedSettings.localFiles.settingsPath, normalizedSettings);
  }
  return loadSettingsFromDisk();
}

export async function clearOpenAIApiKey(): Promise<AppSettings> {
  await getOpenAICredentialStore().clear();
  const settings = await loadSettingsMetadataFromDisk();
  return saveSettingsToDisk({
    ...settings,
    openai: {
      ...settings.openai,
      apiKeyConfigured: false,
      apiKeyUpdate: undefined,
    },
  });
}

export async function getConversationsPathFromSettings(): Promise<string> {
  const settings = await loadSettingsFromDisk();
  return settings.localFiles.conversationsDirectory;
}

export async function getAgentsPathFromSettings(): Promise<string> {
  const settings = await loadSettingsFromDisk();
  return settings.localFiles.agentsDirectory;
}
