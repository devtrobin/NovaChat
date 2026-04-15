import React from "react";
import { AGENTS, createConversationIndicators } from "../../services/workspace/workspace.service";
import { loadChatPageState } from "../../services/chat/chat.service";
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
  const [sendingConversationIds, setSendingConversationIds] = React.useState<string[]>([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const isSending = activeConversationId ? sendingConversationIds.includes(activeConversationId) : false;
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
    sendingConversationIds,
    setActiveAgentId,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setConversations,
    setIsHydrated,
    setIsPreviewMode,
    setSendingConversationIds,
  };
}
