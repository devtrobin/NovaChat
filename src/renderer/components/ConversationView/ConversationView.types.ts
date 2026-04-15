import { Conversation } from "../../types/chat.types";

export type ConversationViewProps = {
  conversation: Conversation;
  initialScrollState?: {
    isAtBottom: boolean;
    scrollTop: number;
  };
  isSending: boolean;
  onKillCommand: (commandId: string) => Promise<void>;
  onMarkConversationAsRead: (conversationId: string) => void;
  onOpenSettings: () => void;
  onScrollStateChange: (
    conversationId: string,
    nextState: {
      isAtBottom: boolean;
      scrollTop: number;
    },
  ) => void;
  onSendMessage: (content: string) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
  onUpdateDraft: (conversationId: string, draft: string) => void;
  searchQuery: string;
  selectedSearchMessageId?: string | null;
};
