import { Conversation } from "../../types/chat.types";
import { SubmitPermissionDecisionRequest } from "../../../shared/ai.types";

export type ChatPageProps = {
  activeConversation: Conversation | null;
  isSending: boolean;
  onDeleteConversation: (conversationId: string) => void;
  onKillCommand: (commandId: string) => Promise<void>;
  onMarkConversationAsRead: (conversationId: string) => void;
  onOpenSettings: () => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  onStopTurn: (conversationId: string) => Promise<void>;
  onSubmitPermissionDecision: (payload: SubmitPermissionDecisionRequest) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
  onUpdateConversationDraft: (conversationId: string, draft: string) => void;
};
