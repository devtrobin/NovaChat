import React from "react";
import { createConversationIndicators } from "../../services/workspace/workspace.service";
import { loadChatPageState } from "../../services/chat/chat.service";
import { Conversation, StorageRecoveryNotice } from "../../../shared/chat.types";
import {
  WorkspaceError,
  WorkspaceLayoutController,
} from "./WorkspaceLayout.types";
import { AgentSettingsMap } from "../../../shared/settings.types";

export function useWorkspaceLayoutState() {
  const initialState = React.useMemo(() => loadChatPageState(), []);
  const defaultAgentSettings = React.useMemo<AgentSettingsMap>(() => ({
    "agent-acp": { enabled: true },
    "agent-ael": { enabled: true },
  }), []);
  const [conversations, setConversations] = React.useState<Conversation[]>(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    initialState.activeConversationId,
  );
  const [activeSection, setActiveSection] = React.useState<"agents" | "conversations" | "settings">("conversations");
  const [activeAgentId, setActiveAgentId] = React.useState<string | null>("agent-ael");
  const [agentSettings, setAgentSettings] = React.useState<AgentSettingsMap>(defaultAgentSettings);
  const [activeSettingsCategory, setActiveSettingsCategory] = React.useState<WorkspaceLayoutController["activeSettingsCategory"]>("local-files");
  const [sendingConversationIds, setSendingConversationIds] = React.useState<string[]>([]);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hydrationAttempt, setHydrationAttempt] = React.useState(0);
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);
  const [hideInternalConversations, setHideInternalConversations] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [storageRecovery, setStorageRecovery] = React.useState<StorageRecoveryNotice | null>(null);
  const [workspaceError, setWorkspaceError] = React.useState<WorkspaceError | null>(null);

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
    hydrationAttempt,
    hydrationError,
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
    setHydrationAttempt,
    setHydrationError,
    setIsHydrated,
    setIsPreviewMode,
    setSendingConversationIds,
    setStorageRecovery,
    storageRecovery,
    setWorkspaceError,
    workspaceError,
  };
}
