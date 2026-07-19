import { buildAgentDefinitions } from "../../services/workspace/workspace.service";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";
import { filterConversationForUser } from "./message-visibility.service";
import { useWorkspaceConversationActions } from "./useWorkspaceConversationActions";
import { useWorkspaceEffects } from "./useWorkspaceEffects";
import { useWorkspaceHydration } from "./useWorkspaceHydration";
import { useWorkspaceLayoutHandlers } from "./useWorkspaceLayoutHandlers";
import { useWorkspaceLayoutState } from "./useWorkspaceLayoutState";

export function useWorkspaceLayoutController(): WorkspaceLayoutController {
  const {
    activeAgentId,
    activeConversation,
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    agentSettings,
    conversationIndicators,
    conversations,
    hideInternalConversations,
    hydrationAttempt,
    hydrationError,
    isHydrated,
    isPreviewMode,
    isSending,
    setStorageRecovery,
    storageRecovery,
    setSendingConversationIds,
    setActiveAgentId,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setAgentSettings,
    setConversations,
    setHideInternalConversations,
    setHydrationAttempt,
    setHydrationError,
    setIsHydrated,
    setIsPreviewMode,
    setWorkspaceError,
    workspaceError,
  } = useWorkspaceLayoutState();
  useWorkspaceHydration({
    activeConversationId,
    conversations,
    hydrationAttempt,
    isHydrated,
    setAgentSettings,
    setActiveConversationId,
    setConversations,
    setHideInternalConversations,
    setHydrationError,
    setIsHydrated,
    setIsPreviewMode,
    setStorageRecovery,
    setWorkspaceError,
    storageRecovery,
  });
  useWorkspaceEffects({
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    isPreviewMode,
    setActiveSettingsCategory,
    setConversations,
  });
  const {
    handleCreateConversation,
    handleDeleteConversation,
    handleMarkConversationAsRead,
    handleRenameConversation,
    handleSelectConversation,
    handleSendMessage,
    handleStopTurn,
    handleUpdateConversationDraft,
  } = useWorkspaceConversationActions({
    activeConversation,
    setActiveConversationId,
    setActiveSection,
    setConversations,
    setSendingConversationIds,
    setWorkspaceError,
  });
  const {
    handleKillCommand,
    handleSavedSettings,
    handleSelectAgent,
    handleSelectSection,
    handleSelectSettingsCategory,
    handleSubmitPermissionDecision,
    handleSubmitCommandInput,
  } = useWorkspaceLayoutHandlers({
    setAgentSettings,
    setActiveAgentId,
    setActiveSection,
    setActiveSettingsCategory,
    setHideInternalConversations,
    setIsPreviewMode,
    setWorkspaceError,
  });

  const visibleConversation = hideInternalConversations
    ? filterConversationForUser(activeConversation)
    : activeConversation;

  return {
    activeAgentId,
    activeConversation: visibleConversation,
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    agents: buildAgentDefinitions(agentSettings),
    conversationIndicators,
    conversations,
    hideInternalConversations,
    hydrationError,
    isHydrated,
    isPreviewMode,
    isSending,
    onAcknowledgeStorageRecovery: async () => {
      if (!storageRecovery) return;
      const acknowledged = await window.nova.chat.acknowledgeRecovery(storageRecovery.id);
      if (acknowledged) setStorageRecovery(null);
    },
    onCreateConversation: handleCreateConversation,
    onDeleteConversation: handleDeleteConversation,
    onDismissWorkspaceError: () => setWorkspaceError(null),
    onKillCommand: handleKillCommand,
    onMarkConversationAsRead: handleMarkConversationAsRead,
    onRenameConversation: handleRenameConversation,
    onRetryHydration: () => {
      setHydrationError(null);
      setHydrationAttempt((current) => current + 1);
    },
    onSavedSettings: handleSavedSettings,
    onSelectAgent: handleSelectAgent,
    onSelectConversation: handleSelectConversation,
    onSelectSection: handleSelectSection,
    onSelectSettingsCategory: handleSelectSettingsCategory,
    onSendMessage: handleSendMessage,
    onStopTurn: handleStopTurn,
    onSubmitPermissionDecision: handleSubmitPermissionDecision,
    onSubmitCommandInput: handleSubmitCommandInput,
    onUpdateConversationDraft: handleUpdateConversationDraft,
    storageRecovery,
    workspaceError,
  };
}
