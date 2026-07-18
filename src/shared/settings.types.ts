export type AIProviderId = "anthropic" | "google" | "lmstudio" | "mistral" | "ollama" | "openai";
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

export type OpenAISettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openai";
};

export type AppSettings = {
  activeProvider: AIProviderId;
  agents: AgentSettingsMap;
  deviceExecution: DeviceExecutionSettings;
  hideInternalConversations: boolean;
  localFiles: LocalFilesSettings;
  openai: OpenAISettings;
  previewMode: boolean;
};

export type SettingsTestResult = {
  message: string;
  ok: boolean;
};
