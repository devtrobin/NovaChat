export type AIProviderId = "openai";

export type OpenAISettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openai";
};

export type AppSettings = {
  activeProvider: AIProviderId;
  openai: OpenAISettings;
};

export type SettingsTestResult = {
  message: string;
  ok: boolean;
};
