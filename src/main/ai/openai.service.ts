import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentContextFile, AgentId, AgentRequestSource } from "../../shared/agent.types";
import { OpenAISettings } from "../../shared/settings.types";
import { AgentRuntimeContext } from "../agents/agent-prompt.service";
import { buildDeviceAgentInput, buildGenericAgentInput, buildInput } from "./openai.payload";
import { createResponseRecord, postOpenAIResponse } from "./openai.client";
import { throwNovaParseError, throwOpenAIRequestError } from "./openai.errors";
import { extractText, normalizeDeviceCommand, parseProviderResponse, stripCodeFences } from "./openai.parser";
import {
  GenerateDeviceAgentCommandResult,
  GenerateOpenAIReplyResult,
} from "./openai.types";
export { NovaResponseParseError, OpenAIRequestError } from "./openai.types";
export { testOpenAIConnection } from "./openai.connection";

export async function generateOpenAIReply(
  settings: OpenAISettings,
  messages: ChatMessage[],
  enabledAgents: AgentId[],
  signal?: AbortSignal,
): Promise<GenerateOpenAIReplyResult> {
  const requestBody = {
    input: buildInput(messages, enabledAgents),
    model: settings.model,
    store: false,
  };

  const { requestRecord, response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, requestBody, signal);

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

export async function generateDeviceAgentCommand(
  settings: OpenAISettings,
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  goal: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<GenerateDeviceAgentCommandResult> {
  const requestBody = {
    input: buildDeviceAgentInput(context, runtimeContext, goal, userPrompt),
    model: settings.model,
    store: false,
  };

  const { requestRecord, response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, requestBody, signal);

  if (!response.ok) {
    const errorText = await response.text();
    throwOpenAIRequestError(errorText, response.status, response.statusText, requestRecord);
  }

  const data = await response.json() as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  const text = extractText(data);
  const responseRecord = createResponseRecord(data, response.ok, response.status, response.statusText);
  const apiRecords = [requestRecord, responseRecord];
  const command = normalizeDeviceCommand(stripCodeFences(text));

  if (!command) {
    throwNovaParseError(text, apiRecords);
  }

  return {
    apiRecords,
    command,
  };
}

export async function generateAgentTextReply(
  settings: OpenAISettings,
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  request: string,
  userPrompt: string,
  source: AgentRequestSource,
  signal?: AbortSignal,
): Promise<{ apiRecords: ChatMessage["apiRequests"]; text: string }> {
  const requestBody = {
    input: buildGenericAgentInput(context, runtimeContext, request, userPrompt, source),
    model: settings.model,
    store: false,
  };

  const { requestRecord, response } = await postOpenAIResponse(settings.baseUrl, settings.apiKey, requestBody, signal);

  if (!response.ok) {
    const errorText = await response.text();
    throwOpenAIRequestError(errorText, response.status, response.statusText, requestRecord);
  }

  const data = await response.json() as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  const text = extractText(data);
  const responseRecord = createResponseRecord(data, response.ok, response.status, response.statusText);
  const apiRecords = [requestRecord, responseRecord];
  const sanitized = stripCodeFences(text).trim();

  if (!sanitized) {
    throwNovaParseError(text, apiRecords);
  }

  return {
    apiRecords,
    text: sanitized,
  };
}
