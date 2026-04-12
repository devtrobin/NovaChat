export type MessageSender = 'user' | 'assistant' | 'device' | 'system';
export type MessageRecipient = 'user' | 'assistant' | 'device';

export type MessageStatus = 'idle' | 'streaming' | 'error' | 'pending' | 'running' | 'success';

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
