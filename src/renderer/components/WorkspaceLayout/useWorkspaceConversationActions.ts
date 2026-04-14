import React from "react";
import { Conversation } from "../../types/chat.types";
import {
  createConversation,
  deleteConversation,
  getNextActiveConversationId,
  normalizeConversationTitle,
  renameConversation,
  replaceConversation,
} from "../../pages/ChatPage/ChatPage.service";

type UseWorkspaceConversationActionsArgs = {
  activeConversation: Conversation | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSection: React.Dispatch<React.SetStateAction<"agents" | "conversations" | "settings">>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useWorkspaceConversationActions({
  activeConversation,
  setActiveConversationId,
  setActiveSection,
  setConversations,
  setIsSending,
}: UseWorkspaceConversationActionsArgs) {
  const handleCreateConversation = React.useCallback(() => {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setActiveSection("conversations");
  }, [setActiveConversationId, setActiveSection, setConversations]);

  const handleSelectConversation = React.useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setActiveSection("conversations");
  }, [setActiveConversationId, setActiveSection]);

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
    const nextConversation: Conversation = activeConversation ?? createConversation();

    setIsSending(true);
    setActiveConversationId(nextConversation.id);
    setConversations((current) => {
      const exists = current.some((item) => item.id === nextConversation.id);
      return exists ? replaceConversation(current, nextConversation) : [nextConversation, ...current];
    });

    try {
      await window.nova.ai.runTurn({
        conversationId: nextConversation.id,
        messages: nextConversation.messages,
        title: nextConversation.title,
        userInput: content,
      });
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, setActiveConversationId, setConversations, setIsSending]);

  return {
    handleCreateConversation,
    handleDeleteConversation,
    handleRenameConversation,
    handleSelectConversation,
    handleSendMessage,
  };
}
