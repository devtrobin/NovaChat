import { ApiRequestRecord } from "../../shared/chat.types";
import { AELWriteFileOperation } from "../../shared/ael-file.types";

export type ProviderResponse =
  | { content: string; from: "assistant"; to: "user" }
  | { content: string; from: "assistant"; to: "ael" }
  | { agentId: "agent-acp" | "agent-ael"; content: string; from: "assistant"; to: "agent"; action?: never }
  | ({ agentId: "agent-ael"; from: "assistant"; to: "agent" } & AELWriteFileOperation);

export type GenerateOpenAIReplyResult = {
  apiRecords: ApiRequestRecord[];
  providerResponse: ProviderResponse;
};

export type GenerateAELAgentCommandResult = {
  apiRecords: ApiRequestRecord[];
  command: string;
  fileOperation?: AELWriteFileOperation;
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
