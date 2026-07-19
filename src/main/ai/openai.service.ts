import { ChatMessage } from "../../shared/chat.types";
import { AgentContextFile, AgentId } from "../../shared/agent.types";
import { OpenAIRuntimeSettings } from "../../shared/settings.types";
import {
  AgentRuntimeContext,
  createAgentRuntimeContext,
} from "../agents/agent-prompt.service";
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
  settings: OpenAIRuntimeSettings,
  messages: ChatMessage[],
  enabledAgents: AgentId[],
  signal?: AbortSignal,
  finalResponseOnly = false,
): Promise<GenerateOpenAIReplyResult> {
  const runtimeContext = createAgentRuntimeContext(settings.provider);
  const requestBody = {
    input: buildInput(messages, enabledAgents, {
      finalResponseOnly,
      runtimeContext,
    }),
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
  settings: OpenAIRuntimeSettings,
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
  settings: OpenAIRuntimeSettings,
  agentId: AgentId,
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  request: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<{ apiRecords: ChatMessage["apiRequests"]; text: string }> {
  const requestBody = {
    input: buildGenericAgentInput(agentId, context, runtimeContext, request, userPrompt),
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
