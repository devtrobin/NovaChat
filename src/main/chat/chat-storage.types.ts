export type ConversationIndexEntry = {
  createdAt: string;
  id: string;
  messageIds: string[];
  title: string;
  updatedAt: string;
};

export type ConversationsIndex = {
  activeConversationId: string | null;
  conversations: ConversationIndexEntry[];
};
