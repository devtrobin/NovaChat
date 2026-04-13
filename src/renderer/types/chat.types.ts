export type MessageSender = 'user' | 'assistant' | 'device' | 'system';
export type MessageRecipient = 'user' | 'assistant' | 'device';

export type MessageStatus =
  | 'idle'
  | 'streaming'
  | 'error'
  | 'pending'
  | 'running'
  | 'success'
  | 'waiting-input';

export type MessageLifecycleEntry = {
  at: string;
  details?: string;
  event: string;
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
  actionType?: "open-settings";
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
  updatedAt: string;
  messages: ChatMessage[];
};

export type PersistedChatState = {
  activeConversationId: string | null;
  conversations: Conversation[];
};

export type DeviceCommandResult = {
  commandId: string;
  code: number;
  ok: boolean;
  output: string;
};

export type StartedDeviceCommand = {
  commandId: string;
};

export type DeviceCommandProgress = {
  awaitingInput: boolean;
  commandId: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  output: string;
};
