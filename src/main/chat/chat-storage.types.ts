export type ConversationIndexEntry = {
  createdAt: string;
  draft?: string;
  id: string;
  lastReadAt?: string;
  messageIds: string[];
  origin?: "assistant" | "user";
  title: string;
  updatedAt: string;
};

export type ConversationsIndex = {
  activeConversationId: string | null;
  conversations: ConversationIndexEntry[];
};
