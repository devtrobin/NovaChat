import { AppSettings } from "../../../shared/settings.types";
import { Conversation } from "../../types/chat.types";
import {
  AgentDefinition,
  ConversationIndicator,
  SettingsCategory,
  WorkspaceSection,
} from "../../services/workspace/workspace.types";

export type WorkspaceLayoutController = {
  activeAgentId: string | null;
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  activeSection: WorkspaceSection;
  activeSettingsCategory: SettingsCategory;
  agents: AgentDefinition[];
  conversationIndicators: Record<string, ConversationIndicator>;
  conversations: Conversation[];
  isHydrated: boolean;
  isPreviewMode: boolean;
  isSending: boolean;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onKillCommand: (commandId: string) => Promise<void>;
  onRenameConversation: (conversationId: string, title: string) => void;
  onSavedSettings: (settings: AppSettings) => void;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectSection: (section: WorkspaceSection) => void;
  onSelectSettingsCategory: (category: SettingsCategory) => void;
  onSendMessage: (content: string) => Promise<void>;
  onSubmitCommandInput: (commandId: string, value: string) => Promise<void>;
  onMarkConversationAsRead: (conversationId: string) => void;
  onUpdateConversationDraft: (conversationId: string, draft: string) => void;
};
