import React from "react";
import ChatInput from "../../components/ChatInput/ChatInput";
import ConversationSidebar from "../../components/ConversationSidebar/ConversationSidebar";
import EmptyState from "../../components/EmptyState/EmptyState";
import MessageList from "../../components/MessageList/MessageList";
import SettingsModal from "../../components/SettingsModal/SettingsModal";
import TopBar from "../../components/TopBar/TopBar";
import { loadStoredChatState, saveStoredChatState } from "../../services/conversation.service";
import { Conversation } from "../../types/chat.types";
import {
  applyChatTurnEvent,
  createConversation,
  deleteConversation,
  getNextActiveConversationId,
  loadChatPageState,
  normalizeConversationTitle,
  renameConversation,
  replaceConversation,
} from "./ChatPage.service";
import "./ChatPage.css";

export default function ChatPage() {
  const initialState = React.useMemo(() => loadChatPageState(), []);
  const [conversations, setConversations] = React.useState(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    initialState.activeConversationId,
  );
  const [isSending, setIsSending] = React.useState(initialState.isSending);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  React.useEffect(() => {
    let active = true;

    async function hydrateChatState() {
      const storedState = await loadStoredChatState();
      if (!active) return;
      setConversations(storedState.conversations);
      setActiveConversationId(storedState.activeConversationId);
      setIsHydrated(true);
    }

    void hydrateChatState();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;
    void saveStoredChatState({
      activeConversationId,
      conversations,
    });
  }, [activeConversationId, conversations, isHydrated]);

  React.useEffect(() => {
    const unsubscribe = window.nova.ai.onEvent((event) => {
      setConversations((current) => applyChatTurnEvent(current, event));
    });

    return unsubscribe;
  }, []);

  const handleCreateConversation = React.useCallback(() => {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
  }, []);

  const handleSelectConversation = React.useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleRenameConversation = React.useCallback((conversationId: string, title: string) => {
    setConversations((current) => {
      const existingConversation = current.find((item) => item.id === conversationId);
      if (!existingConversation) return current;
      const nextTitle = normalizeConversationTitle(title, existingConversation.title);
      return renameConversation(current, conversationId, nextTitle);
    });
  }, []);

  const handleDeleteConversation = React.useCallback((conversationId: string) => {
    setConversations((current) => {
      const nextActiveConversationId = getNextActiveConversationId(current, conversationId);
      setActiveConversationId(nextActiveConversationId);
      return deleteConversation(current, conversationId);
    });
  }, []);

  const handleSendMessage = React.useCallback(async (content: string) => {
    const baseConversation = activeConversation ?? createConversation();
    const nextConversation: Conversation = activeConversation
      ? activeConversation
      : baseConversation;

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
  }, [activeConversation]);

  const handleKillCommand = React.useCallback(async (commandId: string) => {
    await window.nova.ai.killCommand(commandId);
  }, []);

  return (
    <div className="chat-page">
      <ConversationSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectConversation={handleSelectConversation}
      />
      <main className="chat-page__main">
        <TopBar
          isDeletable={Boolean(activeConversation)}
          isEditable={Boolean(activeConversation)}
          onDelete={() => {
            if (!activeConversation) return;
            handleDeleteConversation(activeConversation.id);
          }}
          onRename={(value) => {
            if (!activeConversation) return;
            handleRenameConversation(activeConversation.id, value);
          }}
          title={activeConversation?.title ?? "Nova Chat"}
        />
        <section className="chat-page__content">
          <div className="chat-page__panel">
            {activeConversation && activeConversation.messages.length > 0 ? (
              <MessageList
                messages={activeConversation.messages}
                onKillCommand={handleKillCommand}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </section>
        <ChatInput isSending={isSending} onSubmit={handleSendMessage} />
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => undefined}
      />
    </div>
  );
}
