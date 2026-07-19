import { RunTurnRequest } from "../../shared/ai.types";
import {
  ChatMessage,
  PersistedChatState,
  SystemActionId,
} from "../../shared/chat.types";
import { parseAgentId } from "./ipc-payload.validation.agent";
import {
  assertSerializedSize,
  assertUniqueIds,
  InvalidIpcPayloadError,
  readArray,
  readEnum,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalString,
  readOptionalTimestamp,
  readRecord,
  readSafeId,
  readString,
  readTimestamp,
} from "./ipc-payload.validation.primitives";

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
const MAX_MESSAGE_CHARACTERS = 1_100_000;

export function parseRunTurnRequest(value: unknown): RunTurnRequest {
  assertSerializedSize(value, "runTurn", 8 * 1024 * 1024);
  const payload = readRecord(value, "runTurn");
  return {
    conversationId: readSafeId(payload.conversationId, "runTurn.conversationId"),
    messages: readArray(payload.messages, "runTurn.messages", 5_000)
      .map((message, index) => parseChatMessage(message, `runTurn.messages[${index}]`)),
    title: readString(payload.title, "runTurn.title", 0, 500),
    userInput: readString(payload.userInput, "runTurn.userInput", 1, 200_000),
  };
}

export function parsePersistedChatState(value: unknown): PersistedChatState {
  assertSerializedSize(value, "chatState", 25 * 1024 * 1024);
  const state = readRecord(value, "chatState");
  const conversations = readArray(state.conversations, "chatState.conversations", 1_000)
    .map((value, index) => parseConversation(value, index));
  assertUniqueIds(conversations, "chatState.conversations");
  const activeConversationId = state.activeConversationId === null
    ? null
    : readSafeId(state.activeConversationId, "chatState.activeConversationId");
  if (activeConversationId && !conversations.some(({ id }) => id === activeConversationId)) {
    throw new InvalidIpcPayloadError("chatState.activeConversationId", "conversation inconnue");
  }
  return { activeConversationId, conversations };
}

function parseConversation(value: unknown, index: number): PersistedChatState["conversations"][number] {
  const field = `chatState.conversations[${index}]`;
  const conversation = readRecord(value, field);
  return {
    createdAt: readTimestamp(conversation.createdAt, `${field}.createdAt`),
    draft: readOptionalString(conversation.draft, `${field}.draft`, 200_000),
    id: readSafeId(conversation.id, `${field}.id`),
    lastReadAt: readOptionalTimestamp(conversation.lastReadAt, `${field}.lastReadAt`),
    messages: readArray(conversation.messages, `${field}.messages`, 5_000)
      .map((message, messageIndex) => parseChatMessage(message, `${field}.messages[${messageIndex}]`)),
    origin: readOptionalEnum(conversation.origin, `${field}.origin`, ["assistant", "user"] as const),
    title: readString(conversation.title, `${field}.title`, 0, 500),
    updatedAt: readTimestamp(conversation.updatedAt, `${field}.updatedAt`),
  };
}

function parseChatMessage(value: unknown, field: string): ChatMessage {
  const message = readRecord(value, field);
  const parsed: ChatMessage = {
    apiRequests: parseApiRequests(message.apiRequests, field),
    content: readString(message.content, `${field}.content`, 0, MAX_MESSAGE_CHARACTERS),
    createdAt: readTimestamp(message.createdAt, `${field}.createdAt`),
    from: readEnum(message.from, `${field}.from`, MESSAGE_SENDERS),
    id: readSafeId(message.id, `${field}.id`),
    lifecycleLog: parseLifecycleLog(message.lifecycleLog, field),
    to: readEnum(message.to, `${field}.to`, MESSAGE_RECIPIENTS),
  };
  assignOptionalMessageFields(parsed, message, field);
  return parsed;
}

function assignOptionalMessageFields(
  parsed: ChatMessage,
  message: Record<string, unknown>,
  field: string,
): void {
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
  parsed.visibility = readOptionalEnum(message.visibility, `${field}.visibility`, ["internal", "public"] as const);
  parsed.actions = parseActions(message.actions, field);
}

function parseApiRequests(value: unknown, field: string): ChatMessage["apiRequests"] {
  if (value === undefined) return undefined;
  return readArray(value, `${field}.apiRequests`, 500).map((entry, index) => {
    const requestField = `${field}.apiRequests[${index}]`;
    const request = readRecord(entry, requestField);
    return {
      at: readTimestamp(request.at, `${requestField}.at`),
      direction: readEnum(request.direction, `${requestField}.direction`, ["request", "response"] as const),
      from: readString(request.from, `${requestField}.from`, 1, 200),
      payload: request.payload,
      to: readString(request.to, `${requestField}.to`, 1, 200),
    };
  });
}

function parseLifecycleLog(value: unknown, field: string): ChatMessage["lifecycleLog"] {
  if (value === undefined) return undefined;
  return readArray(value, `${field}.lifecycleLog`, 1_000).map((entry, index) => {
    const entryField = `${field}.lifecycleLog[${index}]`;
    const record = readRecord(entry, entryField);
    return {
      at: readTimestamp(record.at, `${entryField}.at`),
      details: readOptionalString(record.details, `${entryField}.details`, 20_000),
      event: readString(record.event, `${entryField}.event`, 1, 200),
      metadata: record.metadata === undefined ? undefined : readRecord(record.metadata, `${entryField}.metadata`),
    };
  });
}

function parseActions(value: unknown, field: string): ChatMessage["actions"] {
  if (value === undefined) return undefined;
  return readArray(value, `${field}.actions`, 20).map((entry, index) => {
    const actionField = `${field}.actions[${index}]`;
    const action = readRecord(entry, actionField);
    return {
      id: readEnum(action.id, `${actionField}.id`, SYSTEM_ACTION_IDS) as SystemActionId,
      label: readString(action.label, `${actionField}.label`, 1, 200),
      payload: action.payload === undefined
        ? undefined
        : parseStringRecord(action.payload, `${actionField}.payload`),
    };
  });
}

function parseStringRecord(value: unknown, field: string): Record<string, string> {
  const entries = Object.entries(readRecord(value, field));
  if (entries.length > 20) {
    throw new InvalidIpcPayloadError(field, "20 proprietes maximum");
  }
  return Object.fromEntries(entries.map(([key, entry]) => [
    readString(key, `${field}.key`, 1, 100),
    readString(entry, `${field}.${key}`, 0, 500),
  ]));
}
