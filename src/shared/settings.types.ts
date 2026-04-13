export type AIProviderId = "openai";

export type LocalFilesSettings = {
  conversationsDirectory: string;
  settingsPath: string;
};

export type OpenAISettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openai";
};

export type AppSettings = {
  activeProvider: AIProviderId;
  localFiles: LocalFilesSettings;
  openai: OpenAISettings;
  previewMode: boolean;
};

export type SettingsTestResult = {
  message: string;
  ok: boolean;
};
