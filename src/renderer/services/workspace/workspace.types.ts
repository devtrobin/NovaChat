import { Conversation } from "../../types/chat.types";

export type WorkspaceSection = "agents" | "conversations" | "settings";

export type SettingsCategory =
  | "anthropic"
  | "google"
  | "lmstudio"
  | "local-files"
  | "mistral"
  | "ollama"
  | "openai"
  | "provider";

export type AgentDefinition = {
  description: string;
  id: string;
  name: string;
};

export type ConversationIndicator = {
  hasRunningSystemMessage: boolean;
  unreadCount: number;
};

export type WorkspaceSidebarProps = {
  activeAgentId: string | null;
  activeConversationId: string | null;
  activeSection: WorkspaceSection;
  activeSettingsCategory: SettingsCategory;
  agents: AgentDefinition[];
  conversationIndicators: Record<string, ConversationIndicator>;
  conversations: Conversation[];
  isPreviewMode: boolean;
  onCreateConversation: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectSection: (section: WorkspaceSection) => void;
  onSelectSettingsCategory: (category: SettingsCategory) => void;
};
