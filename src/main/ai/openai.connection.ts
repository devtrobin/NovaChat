import { OpenAIRuntimeSettings, SettingsTestResult } from "../../shared/settings.types";
import { postOpenAIResponse } from "./openai.client";

const OPENAI_CONNECTION_TIMEOUT_MS = 10_000;

export async function testOpenAIConnection(
  settings: OpenAIRuntimeSettings,
  signal: AbortSignal = AbortSignal.timeout(OPENAI_CONNECTION_TIMEOUT_MS),
): Promise<SettingsTestResult> {
  try {
    const { response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, {
      input: "Reply with OK only.",
      model: settings.model,
      store: false,
    }, signal);

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
    if (
      error instanceof DOMException
      && (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return {
        message: "Le test OpenAI a dépassé le délai de 10 secondes.",
        ok: false,
      };
    }
    return {
      message: error instanceof Error ? error.message : "Connexion OpenAI impossible.",
      ok: false,
    };
  }
}
