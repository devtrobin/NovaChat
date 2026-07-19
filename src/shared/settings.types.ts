export type ActiveAIProviderId = "openai";
export type PlannedAIProviderId = "anthropic" | "google" | "lmstudio" | "mistral" | "ollama";
export type AIProviderId = ActiveAIProviderId | PlannedAIProviderId;
export type AgentId = "agent-planner" | "device-agent";

export type AgentSettingsMap = Record<AgentId, { enabled: boolean }>;

export type LocalFilesSettings = {
  agentsDirectory: string;
  conversationsDirectory: string;
  settingsPath: string;
};

export type DeviceExecutionSettings = {
  maxOutputCharacters: number;
  timeoutMs: number;
};

export type ApiTraceSettings = {
  enabled: boolean;
  maxEntriesPerMessage: number;
  redactSensitiveData: boolean;
  retentionDays: number;
};

export type OpenAISettings = {
  apiKeyConfigured: boolean;
  apiKeyUpdate?: string;
  baseUrl: string;
  model: string;
  provider: "openai";
};

export type OpenAIRuntimeSettings = OpenAISettings & {
  apiKey: string;
};

export type AppSettings = {
  activeProvider: ActiveAIProviderId;
  agents: AgentSettingsMap;
  apiTrace: ApiTraceSettings;
  deviceExecution: DeviceExecutionSettings;
  hideInternalConversations: boolean;
  localFiles: LocalFilesSettings;
  openai: OpenAISettings;
  previewMode: boolean;
};

export type RuntimeAppSettings = Omit<AppSettings, "openai"> & {
  openai: OpenAIRuntimeSettings;
};

export type SettingsTestResult = {
  message: string;
  ok: boolean;
};
