import { ApiRequestRecord } from "../../renderer/types/chat.types";
import { createResponseRecord } from "./openai.client";
import { NovaResponseParseError, OpenAIRequestError } from "./openai.types";

export function throwOpenAIRequestError(
  errorText: string,
  status: number,
  statusText: string,
  requestRecord: ApiRequestRecord,
): never {
  const responseRecord = createResponseRecord(errorText, false, status, statusText);
  throw new OpenAIRequestError(
    errorText,
    [requestRecord, responseRecord],
    formatProviderError(errorText, status, statusText),
  );
}

export function throwNovaParseError(text: string, apiRecords: ApiRequestRecord[]): never {
  throw new NovaResponseParseError(
    text,
    apiRecords,
    `Erreur de parsing Nova: la reponse du provider n'est pas un message Nova valide. Reponse brute: ${truncateForDisplay(text)}`,
  );
}

function formatProviderError(errorText: string, status: number, statusText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { code?: string; message?: string; param?: string };
    };
    if (parsed.error?.message) {
      const parts = [`Erreur OpenAI ${status}`];
      if (parsed.error.code) parts.push(`[${parsed.error.code}]`);
      parts.push(`: ${parsed.error.message}`);
      if (parsed.error.param) parts.push(` (parametre: ${parsed.error.param})`);
      return parts.join("");
    }
  } catch {
    // fallback below
  }

  return `Erreur OpenAI ${status} ${statusText}: ${errorText}`;
}

function truncateForDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "[vide]";
  if (trimmed.length <= 280) return trimmed;
  return `${trimmed.slice(0, 280)}...`;
}
