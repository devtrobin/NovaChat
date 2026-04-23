import React from "react";
import { AgentSettingsMap } from "../../../shared/settings.types";
import { loadStoredChatState, saveStoredChatState } from "../../services/conversation.service";
import { createConversation, markConversationAsRead } from "../../services/chat/chat.service";
import { Conversation } from "../../types/chat.types";

type UseWorkspaceHydrationArgs = {
  activeConversationId: string | null;
  conversations: Conversation[];
  isHydrated: boolean;
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettingsMap>>;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setHideInternalConversations: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHydrated: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useWorkspaceHydration({
  activeConversationId,
  conversations,
  isHydrated,
  setAgentSettings,
  setActiveConversationId,
  setConversations,
  setHideInternalConversations,
  setIsHydrated,
  setIsPreviewMode,
}: UseWorkspaceHydrationArgs) {
  React.useEffect(() => {
    let active = true;

    async function hydrateWorkspace() {
      const storedState = await loadStoredChatState();
      const settings = await window.nova.settings.load();
      if (!active) return;
      setAgentSettings(settings.agents);
      setHideInternalConversations(settings.hideInternalConversations);
      setIsPreviewMode(settings.previewMode);
      if (storedState.conversations.length === 0) {
        const nextConversation = createConversation();
        setConversations([nextConversation]);
        setActiveConversationId(nextConversation.id);
      } else {
        const resolvedActiveConversationId = storedState.activeConversationId ?? storedState.conversations[0]?.id ?? null;
        setConversations(
          resolvedActiveConversationId
            ? markConversationAsRead(storedState.conversations, resolvedActiveConversationId)
            : storedState.conversations,
        );
        setActiveConversationId(resolvedActiveConversationId);
      }
      setIsHydrated(true);
    }

    void hydrateWorkspace();
    return () => {
      active = false;
    };
  }, [setActiveConversationId, setAgentSettings, setConversations, setHideInternalConversations, setIsHydrated, setIsPreviewMode]);

  React.useEffect(() => {
    if (!isHydrated) return;
    void saveStoredChatState({
      activeConversationId,
      conversations,
    });
  }, [activeConversationId, conversations, isHydrated]);
}
