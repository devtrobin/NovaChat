import { Conversation } from "../../types/chat.types";

export type ConversationSidebarProps = {
  activeConversationId: string | null;
  conversations: Conversation[];
  onCreateConversation: () => void;
  onOpenSettings: () => void;
  onSelectConversation: (conversationId: string) => void;
};
