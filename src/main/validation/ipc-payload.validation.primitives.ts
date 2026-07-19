import path from "node:path";

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export class InvalidIpcPayloadError extends Error {
  constructor(field: string, reason: string) {
    super(`Payload IPC invalide (${field}) : ${reason}.`);
    this.name = "InvalidIpcPayloadError";
  }
}

export function assertSerializedSize(
  value: unknown,
  field: string,
  maxBytes: number,
): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new InvalidIpcPayloadError(field, "valeur non serialisable");
  }
  if (typeof serialized !== "string" || Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new InvalidIpcPayloadError(field, `${maxBytes} octets maximum`);
  }
}

export function assertUniqueIds(values: Array<{ id: string }>, field: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      throw new InvalidIpcPayloadError(field, `identifiant duplique ${value.id}`);
    }
    ids.add(value.id);
  }
}

export function readAbsolutePath(value: unknown, field: string): string {
  const filePath = readString(value, field, 1, 4_096);
  if (!path.isAbsolute(filePath)) {
    throw new InvalidIpcPayloadError(field, "chemin absolu attendu");
  }
  return path.normalize(filePath);
}

export function readArray(value: unknown, field: string, maxLength: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidIpcPayloadError(field, "tableau attendu");
  }
  if (value.length > maxLength) {
    throw new InvalidIpcPayloadError(field, `${maxLength} elements maximum`);
  }
  return value;
}

export function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new InvalidIpcPayloadError(field, "booleen attendu");
  }
  return value;
}

export function readEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new InvalidIpcPayloadError(field, `valeur attendue parmi ${allowed.join(", ")}`);
  }
  return value as T[number];
}

export function readHttpUrl(value: unknown, field: string): string {
  const urlValue = readString(value, field, 1, 2_048);
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new InvalidIpcPayloadError(field, "URL HTTP(S) invalide");
  }
  return urlValue;
}

export function readInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new InvalidIpcPayloadError(field, `entier attendu entre ${min} et ${max}`);
  }
  return value as number;
}

export function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  return value === undefined ? undefined : readBoolean(value, field);
}

export function readOptionalEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] | undefined {
  return value === undefined ? undefined : readEnum(value, field, allowed);
}

export function readOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  return value === undefined ? undefined : readString(value, field, 0, maxLength);
}

export function readOptionalTimestamp(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : readTimestamp(value, field);
}

export function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidIpcPayloadError(field, "objet attendu");
  }
  return value as Record<string, unknown>;
}

export function readSafeId(value: unknown, field: string): string {
  const id = readString(value, field, 1, 128);
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new InvalidIpcPayloadError(field, "identifiant non sur");
  }
  return id;
}

export function readString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new InvalidIpcPayloadError(field, "chaine attendue");
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new InvalidIpcPayloadError(field, `longueur attendue entre ${minLength} et ${maxLength}`);
  }
  return value;
}

export function readTimestamp(value: unknown, field: string): string {
  const timestamp = readString(value, field, 1, 64);
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new InvalidIpcPayloadError(field, "date invalide");
  }
  return timestamp;
}
