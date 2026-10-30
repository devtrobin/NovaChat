import { ProviderResponse } from "./openai.types";
import { AgentId } from "../../shared/agent.types";
import { SYSTEM_AGENT_IDS } from "../../shared/system-agent.registry";
import { parseAELWriteFileOperation } from "../validation/ael-file.validation";

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

export function stripCodeFences(value: string): string {
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
    ) {
      continue;
    }

    const normalizedAgentId = normalizeAgentId((maybeResponse as { agentId?: unknown }).agentId);
    if ("action" in maybeResponse) {
      if (maybeResponse.to !== "agent" || normalizedAgentId !== "agent-ael") return null;
      const operation = { ...(parsed as Record<string, unknown>) };
      delete operation.from;
      delete operation.to;
      delete operation.agentId;
      try {
        return { ...parseAELWriteFileOperation(operation), agentId: "agent-ael", from: "assistant", to: "agent" };
      } catch { return null; }
    }
    if (
      maybeResponse.to === "agent"
      && normalizedAgentId
      && typeof maybeResponse.content === "string"
      && maybeResponse.content.trim()
    ) {
      return {
        agentId: normalizedAgentId,
        content: normalizedAgentId === "agent-ael"
          ? normalizeAELCommand(maybeResponse.content)
          : maybeResponse.content.trim(),
        from: "assistant",
        to: "agent",
      };
    }

    if (
      (maybeResponse.to === "user" || maybeResponse.to === "ael")
      && typeof maybeResponse.content === "string"
      && maybeResponse.content.trim()
    ) {
      return {
        content: maybeResponse.to === "ael"
          ? normalizeAELCommand(maybeResponse.content)
          : maybeResponse.content.trim(),
        from: "assistant",
        to: maybeResponse.to,
      };
    }
  }

  return null;
}

function normalizeAgentId(value: unknown): AgentId | null {
  return typeof value === "string" && SYSTEM_AGENT_IDS.includes(value as AgentId)
    ? value as AgentId
    : null;
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

export function normalizeAELCommand(command: string): string {
  const trimmed = command.trim();
  const shellWrappedMatch = trimmed.match(
    /^(?:bash|zsh|sh)\s+-lc\s+(['"])([\s\S]*)\1$/i,
  );

  if (shellWrappedMatch) {
    return shellWrappedMatch[2].trim();
  }

  return trimmed;
}
