import { buildAgentDefinitions } from "../../services/workspace/workspace.service";
import { Conversation } from "../../types/chat.types";
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
    agentSettings,
    conversationIndicators,
    conversations,
    hideInternalConversations,
    isHydrated,
    isPreviewMode,
    isSending,
    setSendingConversationIds,
    setActiveAgentId,
    setActiveConversationId,
    setActiveSection,
    setActiveSettingsCategory,
    setAgentSettings,
    setConversations,
    setHideInternalConversations,
    setIsHydrated,
    setIsPreviewMode,
  } = useWorkspaceLayoutState();
  useWorkspaceHydration({
    activeConversationId,
    conversations,
    isHydrated,
    setAgentSettings,
    setActiveConversationId,
    setConversations,
    setHideInternalConversations,
    setIsHydrated,
    setIsPreviewMode,
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
  });

  const visibleConversation = hideInternalConversations
    ? filterInternalConversationMessages(activeConversation)
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
    onStopTurn: handleStopTurn,
    onSubmitPermissionDecision: handleSubmitPermissionDecision,
    onSubmitCommandInput: handleSubmitCommandInput,
    onUpdateConversationDraft: handleUpdateConversationDraft,
  };
}

function filterInternalConversationMessages(conversation: Conversation | null): Conversation | null {
  if (!conversation) {
    return null;
  }

  return {
    ...conversation,
    messages: conversation.messages.filter((message) => {
      if (message.from === "assistant" && (message.to === "agent" || message.to === "device")) {
        return false;
      }

      if (message.from === "agent") {
        return false;
      }

      if (message.from === "device") {
        return false;
      }

      return true;
    }),
  };
}
