import { AGENTS } from "../../services/workspace/workspace.service";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";
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
    conversationIndicators,
    conversations,
    isHydrated,
    isPreviewMode,
    isSending,
    setSendingConversationIds,
    setActiveAgentId,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setConversations,
    setIsHydrated,
    setIsPreviewMode,
  } = useWorkspaceLayoutState();
  useWorkspaceHydration({
    activeConversationId,
    conversations,
    isHydrated,
    setActiveConversationId,
    setConversations,
    setIsHydrated,
    setIsPreviewMode,
  });
  useWorkspaceEffects({
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    isPreviewMode,
    setActiveSection,
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
    handleUpdateConversationDraft,
  } = useWorkspaceConversationActions({
    activeConversation,
    setActiveConversationId,
    setActiveSection,
    setConversations,
    setSendingConversationIds,
  });
  const {
    handleKillCommand,
    handleSavedSettings,
    handleSelectAgent,
    handleSelectSection,
    handleSelectSettingsCategory,
    handleSubmitCommandInput,
  } = useWorkspaceLayoutHandlers({
    setActiveAgentId,
    setActiveSection,
    setActiveSettingsCategory,
    setIsPreviewMode,
  });

  return {
    activeAgentId,
    activeConversation,
    activeConversationId,
    activeSection,
    activeSettingsCategory,
    agents: [...AGENTS],
    conversationIndicators,
    conversations,
    isHydrated,
    isPreviewMode,
    isSending,
    onCreateConversation: handleCreateConversation,
    onDeleteConversation: handleDeleteConversation,
    onKillCommand: handleKillCommand,
    onMarkConversationAsRead: handleMarkConversationAsRead,
    onRenameConversation: handleRenameConversation,
    onSavedSettings: handleSavedSettings,
    onSelectAgent: handleSelectAgent,
    onSelectConversation: handleSelectConversation,
    onSelectSection: handleSelectSection,
    onSelectSettingsCategory: handleSelectSettingsCategory,
    onSendMessage: handleSendMessage,
    onSubmitCommandInput: handleSubmitCommandInput,
    onUpdateConversationDraft: handleUpdateConversationDraft,
  };
}
