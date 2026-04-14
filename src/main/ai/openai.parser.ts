import { ProviderResponse } from "./openai.types";

export function extractText(data: { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> }): string {
  return data.output?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type?.includes("text"))
    .map((item) => item.text ?? "")
    .join("")
    .trim() ?? "";
}

export function parseProviderResponse(value: string): ProviderResponse | null {
  return parseProviderResponseObject(value);
}

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseProviderResponseObject(value: string): ProviderResponse | null {
  const sanitized = stripCodeFences(value);
  const candidates = [sanitized, extractJsonObject(sanitized)].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of candidates) {
    const parsed = parseJsonRecursively(candidate);
    if (!parsed || typeof parsed !== "object") continue;

    const maybeResponse = parsed as Partial<ProviderResponse>;
    if (
      maybeResponse.from !== "assistant"
      || (maybeResponse.to !== "user" && maybeResponse.to !== "device")
      || typeof maybeResponse.content !== "string"
      || !maybeResponse.content.trim()
    ) {
      continue;
    }

    return {
      content: maybeResponse.to === "device"
        ? normalizeDeviceCommand(maybeResponse.content)
        : maybeResponse.content.trim(),
      from: "assistant",
      to: maybeResponse.to,
    };
  }

  return null;
}

function parseJsonRecursively(value: string, depth = 0): unknown {
  if (depth > 2) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "string") {
      return parseJsonRecursively(parsed, depth + 1);
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return value.slice(start, end + 1).trim();
}

function normalizeDeviceCommand(command: string): string {
  const trimmed = command.trim();
  const shellWrappedMatch = trimmed.match(
    /^(?:bash|zsh|sh)\s+-lc\s+(['"])([\s\S]*)\1$/i,
  );

  if (shellWrappedMatch) {
    return shellWrappedMatch[2].trim();
  }

  return trimmed;
}
