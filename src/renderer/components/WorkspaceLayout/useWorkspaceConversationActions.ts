import React from "react";
import { Conversation } from "../../types/chat.types";
import {
  createConversation,
  deleteConversation,
  getNextActiveConversationId,
  markConversationAsRead,
  normalizeConversationTitle,
  renameConversation,
  replaceConversation,
  updateConversationDraft,
} from "../../services/chat/chat.service";

type UseWorkspaceConversationActionsArgs = {
  activeConversation: Conversation | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSection: React.Dispatch<React.SetStateAction<"agents" | "conversations" | "settings">>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setSendingConversationIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export function useWorkspaceConversationActions({
  activeConversation,
  setActiveConversationId,
  setActiveSection,
  setConversations,
  setSendingConversationIds,
}: UseWorkspaceConversationActionsArgs) {
  const handleCreateConversation = React.useCallback(() => {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setActiveSection("conversations");
  }, [setActiveConversationId, setActiveSection, setConversations]);

  const handleSelectConversation = React.useCallback((conversationId: string) => {
    setConversations((current) => markConversationAsRead(current, conversationId));
    setActiveConversationId(conversationId);
    setActiveSection("conversations");
  }, [setActiveConversationId, setActiveSection, setConversations]);

  const handleRenameConversation = React.useCallback((conversationId: string, title: string) => {
    setConversations((current) => {
      const existingConversation = current.find((item) => item.id === conversationId);
      if (!existingConversation) return current;
      const nextTitle = normalizeConversationTitle(title, existingConversation.title);
      return renameConversation(current, conversationId, nextTitle);
    });
  }, [setConversations]);

  const handleDeleteConversation = React.useCallback((conversationId: string) => {
    setConversations((current) => {
      const nextActiveConversationId = getNextActiveConversationId(current, conversationId);
      setActiveConversationId(nextActiveConversationId);
      return deleteConversation(current, conversationId);
    });
  }, [setActiveConversationId, setConversations]);

  const handleSendMessage = React.useCallback(async (content: string) => {
    const nextConversation: Conversation = {
      ...(activeConversation ?? createConversation()),
      draft: "",
    };
    const nextConversationId = nextConversation.id;

    setSendingConversationIds((current) => (
      current.includes(nextConversationId) ? current : [...current, nextConversationId]
    ));
    setActiveConversationId(nextConversationId);
    setConversations((current) => {
      const exists = current.some((item) => item.id === nextConversationId);
      return exists ? replaceConversation(current, nextConversation) : [nextConversation, ...current];
    });

    try {
      await window.nova.ai.runTurn({
        conversationId: nextConversationId,
        messages: nextConversation.messages,
        title: nextConversation.title,
        userInput: content,
      });
    } finally {
      setSendingConversationIds((current) => current.filter((conversationId) => conversationId !== nextConversationId));
    }
  }, [activeConversation, setActiveConversationId, setConversations, setSendingConversationIds]);

  const handleUpdateConversationDraft = React.useCallback((conversationId: string, draft: string) => {
    setConversations((current) => updateConversationDraft(current, conversationId, draft));
  }, [setConversations]);

  const handleMarkConversationAsRead = React.useCallback((conversationId: string) => {
    setConversations((current) => markConversationAsRead(current, conversationId));
  }, [setConversations]);

  return {
    handleCreateConversation,
    handleDeleteConversation,
    handleMarkConversationAsRead,
    handleRenameConversation,
    handleSelectConversation,
    handleSendMessage,
    handleUpdateConversationDraft,
  };
}
