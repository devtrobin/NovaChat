import { Conversation } from "../../types/chat.types";

export type SidebarSection = "agents" | "conversations" | "settings";

export type ConversationSidebarProps = {
  activeAgentId: string | null;
  activeConversationId: string | null;
  activeSection: SidebarSection;
  agents: Array<{ description: string; id: string; name: string }>;
  conversations: Conversation[];
  isPreviewMode: boolean;
  onCreateConversation: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectSection: (section: SidebarSection) => void;
};
