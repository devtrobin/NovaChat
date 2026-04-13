import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { OpenAISettings, SettingsTestResult } from "../../shared/settings.types";

type ProviderResponse =
  | { content: string; from: "assistant"; to: "device" | "user" };

export class OpenAIRequestError extends Error {
  apiRecords: ApiRequestRecord[];
  displayMessage: string;

  constructor(message: string, apiRecords: ApiRequestRecord[], displayMessage?: string) {
    super(message);
    this.apiRecords = apiRecords;
    this.displayMessage = displayMessage ?? message;
  }
}

export type GenerateOpenAIReplyResult = {
  apiRecords: ApiRequestRecord[];
  providerResponse: ProviderResponse;
};

export async function generateOpenAIReply(
  settings: OpenAISettings,
  messages: ChatMessage[],
): Promise<GenerateOpenAIReplyResult> {
  const requestBody = {
    input: buildInput(messages),
    model: settings.model,
    store: false,
  };

  const response = await fetch(`${stripTrailingSlash(settings.baseUrl)}/responses`, {
    body: JSON.stringify(requestBody),
    headers: {
      "Authorization": `Bearer ${settings.apiKey}`,
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

  if (!response.ok) {
    const errorText = await response.text();
    const displayMessage = formatProviderError(errorText, response.status, response.statusText);
    const responseRecord: ApiRequestRecord = {
      at: new Date().toISOString(),
      direction: "response",
      from: "openai.responses",
      payload: {
        body: errorText,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      },
      to: "nova",
    };
    throw new OpenAIRequestError(errorText, [requestRecord, responseRecord], displayMessage);
  }

  const data = await response.json() as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  const text = extractText(data);
  return {
    apiRecords: [
      requestRecord,
      {
        at: new Date().toISOString(),
        direction: "response",
        from: "openai.responses",
        payload: data,
        to: "nova",
      },
    ],
    providerResponse: parseProviderResponse(text),
  };
}

export async function testOpenAIConnection(settings: OpenAISettings): Promise<SettingsTestResult> {
  try {
    const response = await fetch(`${stripTrailingSlash(settings.baseUrl)}/responses`, {
      body: JSON.stringify({
        input: "Reply with OK only.",
        model: settings.model,
        store: false,
      }),
      headers: {
        "Authorization": `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
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

function buildInput(messages: ChatMessage[]) {
  return [
    {
      content: [
        {
          text: [
            "You are Nova.",
            "You receive the full conversation as Nova JSON messages.",
            "Each message uses this schema: { id, from, to, content, createdAt, status?, result?, commandId?, actionType?, actionLabel?, isExpandable? }.",
            "Reply only with one minified JSON object compatible with the Nova format subset.",
            'If you answer the user directly, reply exactly like: {"from":"assistant","to":"user","content":"..."}',
            'If you need the local machine to run a shell command, reply exactly like: {"from":"assistant","to":"device","content":"<single bash or zsh command>"}',
            "Never answer as user, device or system.",
            "When you ask the device to run a command, the device result will come back later in the conversation as a Nova message from device to assistant.",
            "Use device commands only when they are genuinely needed.",
            "Never wrap JSON in markdown fences.",
          ].join(" "),
          type: "input_text",
        },
      ],
      role: "developer",
    },
    {
      content: [
        {
          text: JSON.stringify({
            conversation: messages.map(toProviderMessage),
          }),
          type: "input_text",
        },
      ],
      role: "user",
    },
  ];
}

function toProviderMessage(message: ChatMessage) {
  return {
    actionLabel: message.actionLabel,
    actionType: message.actionType,
    commandId: message.commandId,
    content: message.content,
    createdAt: message.createdAt,
    from: message.from,
    id: message.id,
    inputPlaceholder: message.inputPlaceholder,
    inputRequested: message.inputRequested,
    inputSecret: message.inputSecret,
    isExpandable: message.isExpandable,
    result: sanitizeResult(message.result),
    status: message.status,
    to: message.to,
  };
}

function sanitizeResult(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4000) return value;
  return `${value.slice(0, 4000)}\n\n[output truncated: ${value.length - 4000} chars omitted]`;
}

function extractText(data: { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> }): string {
  return data.output?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type?.includes("text"))
    .map((item) => item.text ?? "")
    .join("")
    .trim() ?? "";
}

function parseProviderResponse(value: string): ProviderResponse {
  try {
    const parsed = JSON.parse(stripCodeFences(value)) as ProviderResponse;
    if (
      parsed.from === "assistant"
      && (parsed.to === "user" || parsed.to === "device")
      && typeof parsed.content === "string"
      && parsed.content.trim()
    ) {
      return {
        content: parsed.content.trim(),
        from: "assistant",
        to: parsed.to,
      };
    }
  } catch {
    // Fallback below.
  }

  return {
    content: value.trim() || "Je n'ai pas pu formater correctement la reponse.",
    from: "assistant",
    to: "user",
  };
}

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function formatProviderError(errorText: string, status: number, statusText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { code?: string; message?: string; param?: string; type?: string };
    };
    if (parsed.error?.message) {
      const parts = [`Erreur OpenAI ${status}`];
      if (parsed.error.code) parts.push(`[${parsed.error.code}]`);
      parts.push(`: ${parsed.error.message}`);
      if (parsed.error.param) parts.push(` (parametre: ${parsed.error.param})`);
      return parts.join("");
    }
  } catch {
    // Fallback below.
  }

  return `Erreur OpenAI ${status} ${statusText}: ${errorText}`;
}
