import React from "react";
import { loadStoredChatState, saveStoredChatState } from "../../services/conversation.service";
import { createConversation, markConversationAsRead } from "../../services/chat/chat.service";
import { Conversation } from "../../types/chat.types";

type UseWorkspaceHydrationArgs = {
  activeConversationId: string | null;
  conversations: Conversation[];
  isHydrated: boolean;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setIsHydrated: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useWorkspaceHydration({
  activeConversationId,
  conversations,
  isHydrated,
  setActiveConversationId,
  setConversations,
  setIsHydrated,
  setIsPreviewMode,
}: UseWorkspaceHydrationArgs) {
  React.useEffect(() => {
    let active = true;

    async function hydrateWorkspace() {
      const storedState = await loadStoredChatState();
      const settings = await window.nova.settings.load();
      if (!active) return;
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
  }, [setActiveConversationId, setConversations, setIsHydrated, setIsPreviewMode]);

  React.useEffect(() => {
    if (!isHydrated) return;
    void saveStoredChatState({
      activeConversationId,
      conversations,
    });
  }, [activeConversationId, conversations, isHydrated]);
}
