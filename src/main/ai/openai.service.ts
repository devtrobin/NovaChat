import { ChatMessage } from "../../renderer/types/chat.types";
import { OpenAISettings } from "../../shared/settings.types";
import { buildInput } from "./openai.payload";
import { createResponseRecord, postOpenAIResponse } from "./openai.client";
import { throwNovaParseError, throwOpenAIRequestError } from "./openai.errors";
import { extractText, parseProviderResponse } from "./openai.parser";
import {
  GenerateOpenAIReplyResult,
} from "./openai.types";
export { NovaResponseParseError, OpenAIRequestError } from "./openai.types";
export { testOpenAIConnection } from "./openai.connection";

export async function generateOpenAIReply(
  settings: OpenAISettings,
  messages: ChatMessage[],
): Promise<GenerateOpenAIReplyResult> {
  const requestBody = {
    input: buildInput(messages),
    model: settings.model,
    store: false,
  };

  const { requestRecord, response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, requestBody);

  if (!response.ok) {
    const errorText = await response.text();
    throwOpenAIRequestError(errorText, response.status, response.statusText, requestRecord);
  }

  const data = await response.json() as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  const text = extractText(data);
  const responseRecord = createResponseRecord(data, response.ok, response.status, response.statusText);
  const apiRecords = [requestRecord, responseRecord];
  const providerResponse = parseProviderResponse(text);
  if (!providerResponse) {
    throwNovaParseError(text, apiRecords);
  }

  return {
    apiRecords,
    providerResponse,
  };
}
