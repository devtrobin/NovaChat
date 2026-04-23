import React from "react";
import { createConversationIndicators } from "../../services/workspace/workspace.service";
import { loadChatPageState } from "../../services/chat/chat.service";
import { Conversation } from "../../types/chat.types";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";
import { AgentSettingsMap } from "../../../shared/settings.types";

export function useWorkspaceLayoutState() {
  const initialState = React.useMemo(() => loadChatPageState(), []);
  const defaultAgentSettings = React.useMemo<AgentSettingsMap>(() => ({
    "device-agent": { enabled: true },
    "diagnostic-agent": { enabled: true },
  }), []);
  const [conversations, setConversations] = React.useState<Conversation[]>(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    initialState.activeConversationId,
  );
  const [activeSection, setActiveSection] = React.useState<"agents" | "conversations" | "settings">("conversations");
  const [activeAgentId, setActiveAgentId] = React.useState<string | null>("device-agent");
  const [agentSettings, setAgentSettings] = React.useState<AgentSettingsMap>(defaultAgentSettings);
  const [activeSettingsCategory, setActiveSettingsCategory] = React.useState<WorkspaceLayoutController["activeSettingsCategory"]>("local-files");
  const [sendingConversationIds, setSendingConversationIds] = React.useState<string[]>([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hideInternalConversations, setHideInternalConversations] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const isSending = activeConversationId ? sendingConversationIds.includes(activeConversationId) : false;
  const conversationIndicators = React.useMemo(
    () => createConversationIndicators(conversations),
    [conversations],
  );

  return {
    activeAgentId,
    agentSettings,
    activeConversation,
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    conversationIndicators,
    conversations,
    hideInternalConversations,
    isHydrated,
    isPreviewMode,
    isSending,
    sendingConversationIds,
    setActiveAgentId,
    setAgentSettings,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setConversations,
    setHideInternalConversations,
    setIsHydrated,
    setIsPreviewMode,
    setSendingConversationIds,
  };
}
