import React from "react";
import { AGENTS, createConversationIndicators } from "../../services/workspace/workspace.service";
import { loadChatPageState } from "../../pages/ChatPage/ChatPage.service";
import { Conversation } from "../../types/chat.types";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";

export function useWorkspaceLayoutState() {
  const initialState = React.useMemo(() => loadChatPageState(), []);
  const [conversations, setConversations] = React.useState<Conversation[]>(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    initialState.activeConversationId,
  );
  const [activeSection, setActiveSection] = React.useState<"agents" | "conversations" | "settings">("conversations");
  const [activeAgentId, setActiveAgentId] = React.useState<string | null>(AGENTS[0]?.id ?? null);
  const [activeSettingsCategory, setActiveSettingsCategory] = React.useState<WorkspaceLayoutController["activeSettingsCategory"]>("local-files");
  const [isSending, setIsSending] = React.useState(initialState.isSending);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const conversationIndicators = React.useMemo(
    () => createConversationIndicators(conversations),
    [conversations],
  );

  return {
    activeAgentId,
    activeConversation,
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    conversationIndicators,
    conversations,
    isHydrated,
    isPreviewMode,
    isSending,
    setActiveAgentId,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setConversations,
    setIsHydrated,
    setIsPreviewMode,
    setIsSending,
  };
}
