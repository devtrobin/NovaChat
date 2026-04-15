import React from "react";
import { PREVIEW_PROVIDER_CATEGORIES } from "../../services/workspace/workspace.service";
import { Conversation } from "../../types/chat.types";
import {
  applyChatTurnEvent,
  markConversationAsRead,
} from "../../services/chat/chat.service";
import { SettingsCategory } from "../../services/workspace/workspace.types";

type UseWorkspaceEffectsArgs = {
  activeConversationId: string | null;
  activeSection: "agents" | "conversations" | "settings";
  activeSettingsCategory: SettingsCategory;
  isPreviewMode: boolean;
  setActiveSettingsCategory: React.Dispatch<React.SetStateAction<SettingsCategory>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

export function useWorkspaceEffects({
  activeConversationId,
  activeSection,
  activeSettingsCategory,
  isPreviewMode,
  setActiveSettingsCategory,
  setConversations,
}: UseWorkspaceEffectsArgs) {
  React.useEffect(() => {
    const unsubscribe = window.nova.ai.onEvent((event) => {
      setConversations((current) => applyChatTurnEvent(current, event));
    });

    return unsubscribe;
  }, [setConversations]);

  React.useEffect(() => {
    if (activeSection !== "conversations" || !activeConversationId) return;
    setConversations((current) => markConversationAsRead(current, activeConversationId));
  }, [activeConversationId, activeSection, setConversations]);

  React.useEffect(() => {
    if (!isPreviewMode && PREVIEW_PROVIDER_CATEGORIES.includes(activeSettingsCategory)) {
      setActiveSettingsCategory("provider");
    }
  }, [activeSettingsCategory, isPreviewMode, setActiveSettingsCategory]);
}
