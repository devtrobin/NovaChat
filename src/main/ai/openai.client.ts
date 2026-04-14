import { ApiRequestRecord } from "../../renderer/types/chat.types";

export async function postOpenAIResponse(baseUrl: string, apiKey: string, requestBody: unknown) {
  const response = await fetch(`${stripTrailingSlash(baseUrl)}/responses`, {
    body: JSON.stringify(requestBody),
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const requestRecord: ApiRequestRecord = {
    at: new Date().toISOString(),
    direction: "request",
    from: "nova",
    payload: requestBody,
    to: "openai.responses",
  };

  return { requestRecord, response };
}

export function createResponseRecord(payload: unknown, ok: boolean, status: number, statusText: string): ApiRequestRecord {
  return {
    at: new Date().toISOString(),
    direction: "response",
    from: "openai.responses",
    payload: {
      body: payload,
      ok,
      status,
      statusText,
    },
    to: "nova",
  };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
