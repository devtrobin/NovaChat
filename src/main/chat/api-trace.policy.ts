import { ApiRequestRecord } from "../../shared/chat.types";
import { ApiTraceSettings } from "../../shared/settings.types";

const SENSITIVE_KEY_PATTERN = /(?:authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|password|passphrase|secret)/i;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const OPENAI_KEY_PATTERN = /\bsk-[A-Za-z0-9_-]{8,}\b/g;
const REDACTED = "[REDACTED]";

export function applyApiTracePolicy(
  records: ApiRequestRecord[],
  settings: ApiTraceSettings,
  now = Date.now(),
): ApiRequestRecord[] {
  if (!settings.enabled) return [];
  const cutoff = now - settings.retentionDays * 24 * 60 * 60 * 1_000;
  return records
    .filter((record) => {
      const timestamp = Date.parse(record.at);
      return Number.isNaN(timestamp) || timestamp >= cutoff;
    })
    .slice(-settings.maxEntriesPerMessage)
    .map((record) => settings.redactSensitiveData
      ? {
        ...record,
        payload: redactValue(record.payload),
      }
      : record);
}

export function redactValue(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (typeof value === "string") {
    return value
      .replace(BEARER_PATTERN, "Bearer [REDACTED]")
      .replace(OPENAI_KEY_PATTERN, REDACTED);
  }
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, "", seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactValue(entryValue, entryKey, seen),
    ]),
  );
}
