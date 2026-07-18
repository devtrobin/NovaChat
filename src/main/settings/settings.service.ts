import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AgentSettingsMap, AppSettings } from "../../shared/settings.types";
import { parseAppSettings } from "../validation/ipc-payload.validation";

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
      apiKey: "",
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
  try {
    const content = await readFile(filePath, "utf-8");
    return mergeSettings(JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function loadSettingsFromDisk(): Promise<AppSettings> {
  const referenceSettings = await readSettingsFile(getReferenceSettingsPath());
  const fallbackSettings = referenceSettings ?? createDefaultSettings();
  const configuredSettingsPath = fallbackSettings.localFiles.settingsPath;

  if (!configuredSettingsPath || configuredSettingsPath === getReferenceSettingsPath()) {
    return fallbackSettings;
  }

  const configuredSettings = await readSettingsFile(configuredSettingsPath);
  return configuredSettings ?? fallbackSettings;
}

export async function saveSettingsToDisk(settings: AppSettings): Promise<void> {
  const normalizedSettings = mergeSettings(settings);
  await writeJsonFile(getReferenceSettingsPath(), normalizedSettings);

  if (normalizedSettings.localFiles.settingsPath !== getReferenceSettingsPath()) {
    await writeJsonFile(normalizedSettings.localFiles.settingsPath, normalizedSettings);
  }
}

export async function getConversationsPathFromSettings(): Promise<string> {
  const settings = await loadSettingsFromDisk();
  return settings.localFiles.conversationsDirectory;
}

export async function getAgentsPathFromSettings(): Promise<string> {
  const settings = await loadSettingsFromDisk();
  return settings.localFiles.agentsDirectory;
}
