export type MessageSender = 'user' | 'assistant' | 'agent' | 'device' | 'system';
export type MessageRecipient = 'user' | 'assistant' | 'agent' | 'device';
export type ConversationOrigin = 'assistant' | 'user';
export type SystemActionId =
  | "open-settings"
  | "permission-allow"
  | "permission-allow-always"
  | "permission-deny"
  | "permission-deny-always";

export type MessageStatus =
  | 'idle'
  | 'error'
  | 'pending'
  | 'partial-success'
  | 'running'
  | 'success'
  | 'waiting-input';

export type MessageLifecycleEntry = {
  at: string;
  details?: string;
  event: string;
  metadata?: Record<string, unknown>;
};

export type ApiRequestRecord = {
  at: string;
  direction: "request" | "response";
  from: string;
  payload: unknown;
  to: string;
};

export type ChatMessage = {
  actionLabel?: string;
  actionType?: SystemActionId;
  actions?: Array<{
    id: SystemActionId;
    label: string;
    payload?: Record<string, string>;
  }>;
  agentId?: string;
  id: string;
  from: MessageSender;
  to: MessageRecipient;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  result?: string;
  isExpandable?: boolean;
  commandId?: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  inputRequested?: boolean;
  lifecycleLog?: MessageLifecycleEntry[];
  apiRequests?: ApiRequestRecord[];
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  draft?: string;
  lastReadAt?: string;
  origin?: ConversationOrigin;
  updatedAt: string;
  messages: ChatMessage[];
};

export type PersistedChatState = {
  activeConversationId: string | null;
  conversations: Conversation[];
};

export type StorageRecoveryNotice = {
  id: string;
  issues: Array<{
    backupPath?: string;
    filePath: string;
    kind: "invalid-json" | "io-error" | "missing-indexed-data";
    message: string;
    recoveredFromBackup: boolean;
  }>;
  message: string;
};

export type ChatLoadResult = {
  recovery: StorageRecoveryNotice | null;
  state: PersistedChatState;
};

export type DeviceCommandResult = {
  commandId: string;
  code: number;
  cwd: string;
  durationMs: number;
  errorType?: "killed" | "not-found" | "policy" | "shell" | "timeout";
  normalizedCommand: string;
  ok: boolean;
  output: string;
  shell: string;
  signal?: string | null;
};

export type StartedDeviceCommand = {
  commandId: string;
  cwd: string;
  normalizedCommand: string;
  shell: string;
};

export type DeviceCommandProgress = {
  awaitingInput: boolean;
  commandId: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  output: string;
};
