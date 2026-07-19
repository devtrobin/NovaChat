import React from "react";
import { AgentSettingsMap } from "../../../shared/settings.types";
import { loadStoredChatState, saveStoredChatState } from "../../services/conversation.service";
import { createConversation, markConversationAsRead } from "../../services/chat/chat.service";
import { Conversation, StorageRecoveryNotice } from "../../../shared/chat.types";
import { WorkspaceError } from "./WorkspaceLayout.types";

type UseWorkspaceHydrationArgs = {
  activeConversationId: string | null;
  conversations: Conversation[];
  hydrationAttempt: number;
  isHydrated: boolean;
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettingsMap>>;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setHideInternalConversations: React.Dispatch<React.SetStateAction<boolean>>;
  setHydrationError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsHydrated: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setStorageRecovery: React.Dispatch<React.SetStateAction<StorageRecoveryNotice | null>>;
  setWorkspaceError: React.Dispatch<React.SetStateAction<WorkspaceError | null>>;
  storageRecovery: StorageRecoveryNotice | null;
};

export function useWorkspaceHydration({
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
}: UseWorkspaceHydrationArgs) {
  React.useEffect(() => {
    let active = true;

    async function hydrateWorkspace() {
      setHydrationError(null);
      try {
        const loaded = await loadStoredChatState();
        const storedState = loaded.state;
        const settings = await window.nova.settings.load();
        if (!active) return;
        setAgentSettings(settings.agents);
        setHideInternalConversations(settings.hideInternalConversations);
        setIsPreviewMode(settings.previewMode);
        setStorageRecovery(loaded.recovery);
        if (storedState.conversations.length === 0) {
          const nextConversation = createConversation();
          setConversations([nextConversation]);
          setActiveConversationId(nextConversation.id);
        } else {
          const resolvedActiveConversationId = storedState.activeConversationId
            ?? storedState.conversations[0]?.id
            ?? null;
          setConversations(
            resolvedActiveConversationId
              ? markConversationAsRead(storedState.conversations, resolvedActiveConversationId)
              : storedState.conversations,
          );
          setActiveConversationId(resolvedActiveConversationId);
        }
        setIsHydrated(true);
      } catch (error) {
        if (!active) return;
        setHydrationError(getErrorMessage(
          error,
          "Le chargement de l'espace de travail a echoue.",
        ));
      }
    }

    void hydrateWorkspace();
    return () => {
      active = false;
    };
  }, [hydrationAttempt, setActiveConversationId, setAgentSettings, setConversations, setHideInternalConversations, setHydrationError, setIsHydrated, setIsPreviewMode, setStorageRecovery]);

  React.useEffect(() => {
    if (!isHydrated || storageRecovery) return;
    let active = true;
    void saveStoredChatState({
      activeConversationId,
      conversations,
    }).then(() => {
      if (!active) return;
      setWorkspaceError((current) => (
        current?.context === "persistence" ? null : current
      ));
    }).catch((error) => {
      if (!active) return;
      setWorkspaceError({
        context: "persistence",
        message: getErrorMessage(error, "La sauvegarde de la conversation a echoue."),
      });
    });
    return () => {
      active = false;
    };
  }, [activeConversationId, conversations, isHydrated, setWorkspaceError, storageRecovery]);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
