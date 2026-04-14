import { Conversation } from "../../types/chat.types";

export type SidebarSection = "agents" | "conversations" | "settings";
export type SettingsSidebarCategory =
  | "anthropic"
  | "google"
  | "lmstudio"
  | "local-files"
  | "mistral"
  | "ollama"
  | "openai"
  | "provider";

export type ConversationSidebarProps = {
  activeAgentId: string | null;
  activeConversationId: string | null;
  activeSettingsCategory: SettingsSidebarCategory;
  activeSection: SidebarSection;
  agents: Array<{ description: string; id: string; name: string }>;
  conversationIndicators: Record<string, { hasRunningSystemMessage: boolean; unreadCount: number }>;
  conversations: Conversation[];
  isPreviewMode: boolean;
  onCreateConversation: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectSettingsCategory: (category: SettingsSidebarCategory) => void;
  onSelectSection: (section: SidebarSection) => void;
};
