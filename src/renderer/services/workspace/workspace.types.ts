import { AgentId } from "../../../shared/agent.types";
import { Conversation } from "../../types/chat.types";

export type WorkspaceSection = "agents" | "conversations" | "settings";

export type SettingsCategory =
  | "agents-activity"
  | "anthropic"
  | "google"
  | "lmstudio"
  | "local-files"
  | "mistral"
  | "ollama"
  | "openai"
  | "provider";

export type AgentDefinition = {
  capabilities: readonly string[];
  context: string;
  description: string;
  enabled: boolean;
  features: readonly string[];
  id: AgentId;
  mission: string;
  name: string;
  processes: readonly string[];
  tools: readonly string[];
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
