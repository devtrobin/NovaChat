import path from "node:path";
import {
  AgentContextFile,
  AgentId,
  AgentPermissionDecision,
} from "../../shared/agent.types";
import {
  RunTurnRequest,
  SubmitCommandInputRequest,
  SubmitPermissionDecisionRequest,
} from "../../shared/ai.types";
import {
  ChatMessage,
  PersistedChatState,
  SystemActionId,
} from "../../shared/chat.types";
import { AppSettings } from "../../shared/settings.types";

const AGENT_IDS = ["agent-planner", "device-agent"] as const;
const AI_PROVIDERS = ["anthropic", "google", "lmstudio", "mistral", "ollama", "openai"] as const;
const PERMISSION_DECISIONS = ["allow", "allow-always", "deny", "deny-always"] as const;
const STORED_PERMISSION_DECISIONS = ["allow", "deny"] as const;
const MESSAGE_SENDERS = ["user", "assistant", "agent", "device", "system"] as const;
const MESSAGE_RECIPIENTS = ["user", "assistant", "agent", "device"] as const;
const MESSAGE_STATUSES = ["idle", "error", "pending", "partial-success", "running", "success", "waiting-input"] as const;
const SYSTEM_ACTION_IDS = [
  "open-settings",
  "permission-allow",
  "permission-allow-always",
  "permission-deny",
  "permission-deny-always",
] as const;

const MAX_CHAT_PAYLOAD_BYTES = 25 * 1024 * 1024;
const MAX_RUN_TURN_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_MESSAGE_CHARACTERS = 1_100_000;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export class InvalidIpcPayloadError extends Error {
  constructor(field: string, reason: string) {
    super(`Payload IPC invalide (${field}) : ${reason}.`);
    this.name = "InvalidIpcPayloadError";
  }
}

export function parseAgentId(value: unknown, field = "agentId"): AgentId {
  return readEnum(value, field, AGENT_IDS);
}

export function parseTaskId(value: unknown): string {
  return readSafeId(value, "taskId");
}

export function parseCommandId(value: unknown): string {
  return readSafeId(value, "commandId");
}

export function parseConversationId(value: unknown): string {
  return readSafeId(value, "conversationId");
}

export function parseRecoveryId(value: unknown): string {
  return readSafeId(value, "recoveryId");
}

export function parseAgentContextPayload(value: unknown): { agentId: AgentId; context: AgentContextFile } {
  const payload = readRecord(value, "agentContext");
  const context = readRecord(payload.context, "agentContext.context");
  const parsedContext: AgentContextFile = {
    description: readString(context.description, "agentContext.context.description", 0, 4_000),
    instructions: readString(context.instructions, "agentContext.context.instructions", 0, 100_000),
    name: readString(context.name, "agentContext.context.name", 1, 200),
  };

  return {
    agentId: parseAgentId(payload.agentId, "agentContext.agentId"),
    context: parsedContext,
  };
}

export function parseAgentPermissionPayload(value: unknown): {
  agentId: AgentId;
  command: string;
  decision: AgentPermissionDecision;
  remember: boolean;
} {
  const payload = readRecord(value, "agentPermission");
  return {
    agentId: parseAgentId(payload.agentId, "agentPermission.agentId"),
    command: readString(payload.command, "agentPermission.command", 1, 32_768),
    decision: readEnum(payload.decision, "agentPermission.decision", STORED_PERMISSION_DECISIONS),
    remember: readBoolean(payload.remember, "agentPermission.remember"),
  };
}

export function parseDeleteAgentPermissionPayload(value: unknown): { agentId: AgentId; command: string } {
  const payload = readRecord(value, "deleteAgentPermission");
  return {
    agentId: parseAgentId(payload.agentId, "deleteAgentPermission.agentId"),
    command: readString(payload.command, "deleteAgentPermission.command", 1, 32_768),
  };
}

export function parseSubmitCommandInputRequest(value: unknown): SubmitCommandInputRequest {
  const payload = readRecord(value, "commandInput");
  return {
    commandId: readSafeId(payload.commandId, "commandInput.commandId"),
    value: readString(payload.value, "commandInput.value", 0, 65_536),
  };
}

export function parseSubmitPermissionDecisionRequest(value: unknown): SubmitPermissionDecisionRequest {
  const payload = readRecord(value, "permissionDecision");
  return {
    decision: readEnum(payload.decision, "permissionDecision.decision", PERMISSION_DECISIONS),
    requestId: readSafeId(payload.requestId, "permissionDecision.requestId"),
  };
}

export function parseRunTurnRequest(value: unknown): RunTurnRequest {
  assertSerializedSize(value, "runTurn", MAX_RUN_TURN_PAYLOAD_BYTES);
  const payload = readRecord(value, "runTurn");
  const messages = readArray(payload.messages, "runTurn.messages", 5_000)
    .map((message, index) => parseChatMessage(message, `runTurn.messages[${index}]`));

  return {
    conversationId: readSafeId(payload.conversationId, "runTurn.conversationId"),
    messages,
    title: readString(payload.title, "runTurn.title", 0, 500),
    userInput: readString(payload.userInput, "runTurn.userInput", 1, 200_000),
  };
}

export function parsePersistedChatState(value: unknown): PersistedChatState {
  assertSerializedSize(value, "chatState", MAX_CHAT_PAYLOAD_BYTES);
  const state = readRecord(value, "chatState");
  const conversations = readArray(state.conversations, "chatState.conversations", 1_000)
    .map((conversationValue, conversationIndex) => {
      const field = `chatState.conversations[${conversationIndex}]`;
      const conversation = readRecord(conversationValue, field);
      return {
        createdAt: readTimestamp(conversation.createdAt, `${field}.createdAt`),
        draft: readOptionalString(conversation.draft, `${field}.draft`, 200_000),
        id: readSafeId(conversation.id, `${field}.id`),
        lastReadAt: readOptionalTimestamp(conversation.lastReadAt, `${field}.lastReadAt`),
        messages: readArray(conversation.messages, `${field}.messages`, 5_000)
          .map((message, messageIndex) => parseChatMessage(message, `${field}.messages[${messageIndex}]`)),
        origin: conversation.origin === undefined
          ? undefined
          : readEnum(conversation.origin, `${field}.origin`, ["assistant", "user"] as const),
        title: readString(conversation.title, `${field}.title`, 0, 500),
        updatedAt: readTimestamp(conversation.updatedAt, `${field}.updatedAt`),
      };
    });
  assertUniqueIds(conversations, "chatState.conversations");
  const activeConversationId = state.activeConversationId === null
    ? null
    : readSafeId(state.activeConversationId, "chatState.activeConversationId");

  if (activeConversationId && !conversations.some((conversation) => conversation.id === activeConversationId)) {
    throw new InvalidIpcPayloadError("chatState.activeConversationId", "conversation inconnue");
  }

  return { activeConversationId, conversations };
}

export function parseAppSettings(value: unknown): AppSettings {
  assertSerializedSize(value, "settings", 256 * 1024);
  const settings = readRecord(value, "settings");
  const agents = readRecord(settings.agents, "settings.agents");
  const apiTrace = readRecord(settings.apiTrace, "settings.apiTrace");
  const planner = readRecord(agents["agent-planner"], "settings.agents.agent-planner");
  const device = readRecord(agents["device-agent"], "settings.agents.device-agent");
  const deviceExecution = readRecord(settings.deviceExecution, "settings.deviceExecution");
  const localFiles = readRecord(settings.localFiles, "settings.localFiles");
  const openai = readRecord(settings.openai, "settings.openai");

  return {
    activeProvider: readEnum(settings.activeProvider, "settings.activeProvider", AI_PROVIDERS),
    agents: {
      "agent-planner": { enabled: readBoolean(planner.enabled, "settings.agents.agent-planner.enabled") },
      "device-agent": { enabled: readBoolean(device.enabled, "settings.agents.device-agent.enabled") },
    },
    apiTrace: {
      enabled: readBoolean(apiTrace.enabled, "settings.apiTrace.enabled"),
      maxEntriesPerMessage: readInteger(
        apiTrace.maxEntriesPerMessage,
        "settings.apiTrace.maxEntriesPerMessage",
        1,
        500,
      ),
      redactSensitiveData: readBoolean(
        apiTrace.redactSensitiveData,
        "settings.apiTrace.redactSensitiveData",
      ),
      retentionDays: readInteger(apiTrace.retentionDays, "settings.apiTrace.retentionDays", 1, 3_650),
    },
    deviceExecution: {
      maxOutputCharacters: readInteger(
        deviceExecution.maxOutputCharacters,
        "settings.deviceExecution.maxOutputCharacters",
        10_000,
        1_000_000,
      ),
      timeoutMs: readInteger(deviceExecution.timeoutMs, "settings.deviceExecution.timeoutMs", 1_000, 300_000),
    },
    hideInternalConversations: readBoolean(settings.hideInternalConversations, "settings.hideInternalConversations"),
    localFiles: {
      agentsDirectory: readAbsolutePath(localFiles.agentsDirectory, "settings.localFiles.agentsDirectory"),
      conversationsDirectory: readAbsolutePath(localFiles.conversationsDirectory, "settings.localFiles.conversationsDirectory"),
      settingsPath: readAbsolutePath(localFiles.settingsPath, "settings.localFiles.settingsPath"),
    },
    openai: {
      apiKey: readString(openai.apiKey, "settings.openai.apiKey", 0, 16_384),
      baseUrl: readHttpUrl(openai.baseUrl, "settings.openai.baseUrl"),
      model: readString(openai.model, "settings.openai.model", 0, 256),
      provider: readEnum(openai.provider, "settings.openai.provider", ["openai"] as const),
    },
    previewMode: readBoolean(settings.previewMode, "settings.previewMode"),
  };
}

function parseChatMessage(value: unknown, field: string): ChatMessage {
  const message = readRecord(value, field);
  const parsed: ChatMessage = {
    apiRequests: message.apiRequests === undefined
      ? undefined
      : readArray(message.apiRequests, `${field}.apiRequests`, 500)
        .map((requestValue, index) => {
          const requestField = `${field}.apiRequests[${index}]`;
          const request = readRecord(requestValue, requestField);
          return {
            at: readTimestamp(request.at, `${requestField}.at`),
            direction: readEnum(request.direction, `${requestField}.direction`, ["request", "response"] as const),
            from: readString(request.from, `${requestField}.from`, 1, 200),
            payload: request.payload,
            to: readString(request.to, `${requestField}.to`, 1, 200),
          };
        }),
    content: readString(message.content, `${field}.content`, 0, MAX_MESSAGE_CHARACTERS),
    createdAt: readTimestamp(message.createdAt, `${field}.createdAt`),
    from: readEnum(message.from, `${field}.from`, MESSAGE_SENDERS),
    id: readSafeId(message.id, `${field}.id`),
    lifecycleLog: message.lifecycleLog === undefined
      ? undefined
      : readArray(message.lifecycleLog, `${field}.lifecycleLog`, 1_000)
        .map((entryValue, index) => {
          const entryField = `${field}.lifecycleLog[${index}]`;
          const entry = readRecord(entryValue, entryField);
          return {
            at: readTimestamp(entry.at, `${entryField}.at`),
            details: readOptionalString(entry.details, `${entryField}.details`, 20_000),
            event: readString(entry.event, `${entryField}.event`, 1, 200),
            metadata: entry.metadata === undefined
              ? undefined
              : readRecord(entry.metadata, `${entryField}.metadata`),
          };
        }),
    to: readEnum(message.to, `${field}.to`, MESSAGE_RECIPIENTS),
  };

  parsed.actionLabel = readOptionalString(message.actionLabel, `${field}.actionLabel`, 200);
  parsed.actionType = readOptionalEnum(message.actionType, `${field}.actionType`, SYSTEM_ACTION_IDS);
  parsed.agentId = message.agentId === undefined ? undefined : parseAgentId(message.agentId, `${field}.agentId`);
  parsed.commandId = message.commandId === undefined ? undefined : readSafeId(message.commandId, `${field}.commandId`);
  parsed.inputPlaceholder = readOptionalString(message.inputPlaceholder, `${field}.inputPlaceholder`, 500);
  parsed.inputRequested = readOptionalBoolean(message.inputRequested, `${field}.inputRequested`);
  parsed.inputSecret = readOptionalBoolean(message.inputSecret, `${field}.inputSecret`);
  parsed.isExpandable = readOptionalBoolean(message.isExpandable, `${field}.isExpandable`);
  parsed.result = readOptionalString(message.result, `${field}.result`, MAX_MESSAGE_CHARACTERS);
  parsed.status = readOptionalEnum(message.status, `${field}.status`, MESSAGE_STATUSES);

  if (message.actions !== undefined) {
    parsed.actions = readArray(message.actions, `${field}.actions`, 20).map((actionValue, index) => {
      const actionField = `${field}.actions[${index}]`;
      const action = readRecord(actionValue, actionField);
      const payload = action.payload === undefined
        ? undefined
        : parseStringRecord(action.payload, `${actionField}.payload`, 20, 500);
      return {
        id: readEnum(action.id, `${actionField}.id`, SYSTEM_ACTION_IDS) as SystemActionId,
        label: readString(action.label, `${actionField}.label`, 1, 200),
        payload,
      };
    });
  }

  return parsed;
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidIpcPayloadError(field, "objet attendu");
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown, field: string, maxLength: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidIpcPayloadError(field, "tableau attendu");
  }
  if (value.length > maxLength) {
    throw new InvalidIpcPayloadError(field, `${maxLength} elements maximum`);
  }
  return value;
}

function readString(value: unknown, field: string, minLength: number, maxLength: number): string {
  if (typeof value !== "string") {
    throw new InvalidIpcPayloadError(field, "chaine attendue");
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new InvalidIpcPayloadError(field, `longueur attendue entre ${minLength} et ${maxLength}`);
  }
  return value;
}

function readOptionalString(value: unknown, field: string, maxLength: number): string | undefined {
  return value === undefined ? undefined : readString(value, field, 0, maxLength);
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new InvalidIpcPayloadError(field, "booleen attendu");
  }
  return value;
}

function readInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new InvalidIpcPayloadError(field, `entier attendu entre ${min} et ${max}`);
  }
  return value as number;
}

function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  return value === undefined ? undefined : readBoolean(value, field);
}

function readEnum<const T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new InvalidIpcPayloadError(field, `valeur attendue parmi ${allowed.join(", ")}`);
  }
  return value as T[number];
}

function readOptionalEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] | undefined {
  return value === undefined ? undefined : readEnum(value, field, allowed);
}

function readSafeId(value: unknown, field: string): string {
  const id = readString(value, field, 1, 128);
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new InvalidIpcPayloadError(field, "identifiant non sur");
  }
  return id;
}

function readTimestamp(value: unknown, field: string): string {
  const timestamp = readString(value, field, 1, 64);
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new InvalidIpcPayloadError(field, "date invalide");
  }
  return timestamp;
}

function readOptionalTimestamp(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : readTimestamp(value, field);
}

function readAbsolutePath(value: unknown, field: string): string {
  const filePath = readString(value, field, 1, 4_096);
  if (!path.isAbsolute(filePath)) {
    throw new InvalidIpcPayloadError(field, "chemin absolu attendu");
  }
  return path.normalize(filePath);
}

function readHttpUrl(value: unknown, field: string): string {
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

function parseStringRecord(
  value: unknown,
  field: string,
  maxEntries: number,
  maxValueLength: number,
): Record<string, string> {
  const record = readRecord(value, field);
  const entries = Object.entries(record);
  if (entries.length > maxEntries) {
    throw new InvalidIpcPayloadError(field, `${maxEntries} proprietes maximum`);
  }

  return Object.fromEntries(entries.map(([key, entryValue]) => [
    readString(key, `${field}.key`, 1, 100),
    readString(entryValue, `${field}.${key}`, 0, maxValueLength),
  ]));
}

function assertSerializedSize(value: unknown, field: string, maxBytes: number): void {
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

function assertUniqueIds(values: Array<{ id: string }>, field: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      throw new InvalidIpcPayloadError(field, `identifiant duplique ${value.id}`);
    }
    ids.add(value.id);
  }
}
