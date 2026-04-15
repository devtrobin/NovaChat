import { ApiRequestRecord } from "../../renderer/types/chat.types";

export type ProviderResponse =
  | { content: string; from: "assistant"; to: "user" }
  | { content: string; from: "assistant"; to: "device" }
  | { agentId: "device-agent" | "diagnostic-agent"; content: string; from: "assistant"; to: "agent" };

export type GenerateOpenAIReplyResult = {
  apiRecords: ApiRequestRecord[];
  providerResponse: ProviderResponse;
};

export type GenerateDeviceAgentCommandResult = {
  apiRecords: ApiRequestRecord[];
  command: string;
};

export class OpenAIRequestError extends Error {
  apiRecords: ApiRequestRecord[];
  displayMessage: string;

  constructor(message: string, apiRecords: ApiRequestRecord[], displayMessage?: string) {
    super(message);
    this.apiRecords = apiRecords;
    this.displayMessage = displayMessage ?? message;
  }
}

export class NovaResponseParseError extends Error {
  apiRecords: ApiRequestRecord[];
  displayMessage: string;
  rawResponse: string;

  constructor(rawResponse: string, apiRecords: ApiRequestRecord[], displayMessage?: string) {
    super(displayMessage ?? rawResponse);
    this.apiRecords = apiRecords;
    this.displayMessage = displayMessage ?? rawResponse;
    this.rawResponse = rawResponse;
  }
}
