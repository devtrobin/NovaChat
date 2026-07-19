import { AppSettings } from "../../../shared/settings.types";
import { SubmitPermissionDecisionRequest } from "../../../shared/ai.types";
import { Conversation, StorageRecoveryNotice } from "../../../shared/chat.types";
import {
  AgentDefinition,
  ConversationIndicator,
  SettingsCategory,
  WorkspaceSection,
} from "../../services/workspace/workspace.types";

export type WorkspaceError = {
  context: "interaction" | "persistence";
  message: string;
};

export type WorkspaceLayoutController = {
  activeAgentId: string | null;
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  activeSection: WorkspaceSection;
  activeSettingsCategory: SettingsCategory;
  agents: AgentDefinition[];
  conversationIndicators: Record<string, ConversationIndicator>;
  conversations: Conversation[];
  hideInternalConversations: boolean;
  hydrationError: string | null;
  isHydrated: boolean;
  isPreviewMode: boolean;
  isSending: boolean;
  onAcknowledgeStorageRecovery: () => Promise<void>;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onKillCommand: (commandId: string) => Promise<void>;
  onDismissWorkspaceError: () => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onRetryHydration: () => void;
  onSavedSettings: (settings: AppSettings) => void;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectSection: (section: WorkspaceSection) => void;
  onSelectSettingsCategory: (category: SettingsCategory) => void;
  onSendMessage: (content: string) => Promise<void>;
  onStopTurn: (conversationId: string) => Promise<void>;
  onSubmitPermissionDecision: (payload: SubmitPermissionDecisionRequest) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
  onMarkConversationAsRead: (conversationId: string) => void;
  onUpdateConversationDraft: (conversationId: string, draft: string) => void;
  storageRecovery: StorageRecoveryNotice | null;
  workspaceError: WorkspaceError | null;
};
