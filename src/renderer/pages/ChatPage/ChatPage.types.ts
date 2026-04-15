import { Conversation } from "../../types/chat.types";

export type ChatPageProps = {
  activeConversation: Conversation | null;
  isSending: boolean;
  onDeleteConversation: (conversationId: string) => void;
  onKillCommand: (commandId: string) => Promise<void>;
  onMarkConversationAsRead: (conversationId: string) => void;
  onOpenSettings: () => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
  onUpdateConversationDraft: (conversationId: string, draft: string) => void;
};
