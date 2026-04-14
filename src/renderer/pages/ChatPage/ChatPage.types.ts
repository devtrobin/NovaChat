import { Conversation } from "../../types/chat.types";

export type ChatPageState = {
  activeConversationId: string | null;
  conversations: Conversation[];
  isSending: boolean;
};

export type ChatPageProps = {
  activeConversation: Conversation | null;
  isSending: boolean;
  onDeleteConversation: (conversationId: string) => void;
  onKillCommand: (commandId: string) => Promise<void>;
  onOpenSettings: () => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
};
