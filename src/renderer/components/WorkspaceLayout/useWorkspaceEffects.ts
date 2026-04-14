import React from "react";
import { PREVIEW_PROVIDER_CATEGORIES } from "../../services/workspace/workspace.service";
import { Conversation } from "../../types/chat.types";
import {
  applyChatTurnEvent,
  markConversationAsRead,
} from "../../pages/ChatPage/ChatPage.service";
import { SettingsCategory } from "../../services/workspace/workspace.types";

type UseWorkspaceEffectsArgs = {
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  activeSection: "agents" | "conversations" | "settings";
  activeSettingsCategory: SettingsCategory;
  isPreviewMode: boolean;
  setActiveSection: React.Dispatch<React.SetStateAction<"agents" | "conversations" | "settings">>;
  setActiveSettingsCategory: React.Dispatch<React.SetStateAction<SettingsCategory>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

export function useWorkspaceEffects({
  activeConversation,
  activeConversationId,
  activeSection,
  activeSettingsCategory,
  isPreviewMode,
  setActiveSection,
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
  }, [activeConversation?.updatedAt, activeConversationId, activeSection, setConversations]);

  React.useEffect(() => {
    if (!isPreviewMode && activeSection === "agents") {
      setActiveSection("conversations");
    }
  }, [activeSection, isPreviewMode, setActiveSection]);

  React.useEffect(() => {
    if (!isPreviewMode && PREVIEW_PROVIDER_CATEGORIES.includes(activeSettingsCategory)) {
      setActiveSettingsCategory("provider");
    }
  }, [activeSettingsCategory, isPreviewMode, setActiveSettingsCategory]);
}
