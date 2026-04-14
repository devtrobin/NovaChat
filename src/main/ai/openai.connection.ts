import { OpenAISettings, SettingsTestResult } from "../../shared/settings.types";
import { postOpenAIResponse } from "./openai.client";

export async function testOpenAIConnection(settings: OpenAISettings): Promise<SettingsTestResult> {
  try {
    const { response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, {
      input: "Reply with OK only.",
      model: settings.model,
      store: false,
    });

    if (!response.ok) {
      return {
        message: await response.text(),
        ok: false,
      };
    }

    return {
      message: "Connexion OpenAI valide.",
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Connexion OpenAI impossible.",
      ok: false,
    };
  }
}
