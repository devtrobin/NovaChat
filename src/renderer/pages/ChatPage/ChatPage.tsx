import React from "react";
import ChatInput from "../../components/ChatInput/ChatInput";
import ConversationSidebar from "../../components/ConversationSidebar/ConversationSidebar";
import EmptyState from "../../components/EmptyState/EmptyState";
import MessageList from "../../components/MessageList/MessageList";
import SettingsModal from "../../components/SettingsModal/SettingsModal";
import TopBar from "../../components/TopBar/TopBar";
import { SettingsSidebarCategory } from "../../components/ConversationSidebar/ConversationSidebar.types";
import { loadStoredChatState, saveStoredChatState } from "../../services/conversation.service";
import { Conversation } from "../../types/chat.types";
import {
  applyChatTurnEvent,
  createConversation,
  deleteConversation,
  getConversationUnreadCount,
  getNextActiveConversationId,
  hasConversationRunningSystemMessage,
  loadChatPageState,
  markConversationAsRead,
  normalizeConversationTitle,
  renameConversation,
  replaceConversation,
} from "./ChatPage.service";
import "./ChatPage.css";

const AGENTS = [
  { description: "Pilotage global de la conversation Nova.", id: "main-agent", name: "Assistant principal" },
  { description: "Execution des commandes et interactions device.", id: "device-agent", name: "Device" },
] as const;

export default function ChatPage() {
  const initialState = React.useMemo(() => loadChatPageState(), []);
  const [conversations, setConversations] = React.useState(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    initialState.activeConversationId,
  );
  const [activeSection, setActiveSection] = React.useState<"agents" | "conversations" | "settings">("conversations");
  const [activeAgentId, setActiveAgentId] = React.useState<string | null>(AGENTS[0]?.id ?? null);
  const [activeSettingsCategory, setActiveSettingsCategory] = React.useState<SettingsSidebarCategory>("local-files");
  const [isSending, setIsSending] = React.useState(initialState.isSending);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const searchMatches = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!activeConversation || !normalizedQuery) return [];

    return activeConversation.messages
      .filter((message) => [message.content, message.result]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery)))
      .map((message) => message.id);
  }, [activeConversation, searchQuery]);
  const selectedSearchMessageId = searchMatches[selectedSearchIndex] ?? null;
  const conversationIndicators = React.useMemo(() => Object.fromEntries(
    conversations.map((conversation) => [
      conversation.id,
      {
        hasRunningSystemMessage: hasConversationRunningSystemMessage(conversation),
        unreadCount: getConversationUnreadCount(conversation),
      },
    ]),
  ), [conversations]);

  const goToNextSearchMatch = React.useCallback(() => {
    setSelectedSearchIndex((current) => (
      searchMatches.length === 0
        ? 0
        : (current + 1) % searchMatches.length
    ));
  }, [searchMatches.length]);

  const goToPreviousSearchMatch = React.useCallback(() => {
    setSelectedSearchIndex((current) => (
      searchMatches.length === 0
        ? 0
        : (current - 1 + searchMatches.length) % searchMatches.length
    ));
  }, [searchMatches.length]);

  React.useEffect(() => {
    let active = true;

    async function hydrateChatState() {
      const storedState = await loadStoredChatState();
      const settings = await window.nova.settings.load();
      if (!active) return;
      setIsPreviewMode(settings.previewMode);
      if (storedState.conversations.length === 0) {
        const nextConversation = createConversation();
        setConversations([nextConversation]);
        setActiveConversationId(nextConversation.id);
      } else {
        setConversations(storedState.conversations);
        setActiveConversationId(storedState.activeConversationId ?? storedState.conversations[0]?.id ?? null);
      }
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

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        if (activeSection !== "conversations") return;
        event.preventDefault();
        setIsSearchOpen(true);
        globalThis.setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 0);
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSection]);

  React.useEffect(() => {
    setSelectedSearchIndex(0);
  }, [searchQuery, activeConversationId]);

  React.useEffect(() => {
    if (activeSection !== "conversations") {
      setIsSearchOpen(false);
    }
  }, [activeSection]);

  React.useEffect(() => {
    if (activeSection !== "conversations" || !activeConversationId) return;
    setConversations((current) => markConversationAsRead(current, activeConversationId));
  }, [activeConversation?.updatedAt, activeConversationId, activeSection]);

  React.useEffect(() => {
    if (!isPreviewMode && activeSection === "agents") {
      setActiveSection("conversations");
    }
  }, [activeSection, isPreviewMode]);

  React.useEffect(() => {
    if (
      !isPreviewMode
      && ["anthropic", "google", "mistral", "ollama", "lmstudio"].includes(activeSettingsCategory)
    ) {
      setActiveSettingsCategory("provider");
    }
  }, [activeSettingsCategory, isPreviewMode]);

  const handleCreateConversation = React.useCallback(() => {
    const nextConversation = createConversation();
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setActiveSection("conversations");
  }, []);

  const handleSelectConversation = React.useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setActiveSection("conversations");
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

  const handleSubmitCommandInput = React.useCallback(async (commandId: string, value: string) => {
    await window.nova.ai.submitCommandInput({
      commandId,
      value,
    });
  }, []);

  return (
    <div className="chat-page">
      <ConversationSidebar
        activeAgentId={activeAgentId}
        activeConversationId={activeConversationId}
        activeSettingsCategory={activeSettingsCategory}
        activeSection={activeSection}
        agents={[...AGENTS]}
        conversationIndicators={conversationIndicators}
        conversations={conversations}
        isPreviewMode={isPreviewMode}
        onCreateConversation={handleCreateConversation}
        onSelectAgent={(agentId) => {
          setActiveAgentId(agentId);
          setActiveSection("agents");
        }}
        onSelectConversation={handleSelectConversation}
        onSelectSettingsCategory={setActiveSettingsCategory}
        onSelectSection={setActiveSection}
      />
      <main className="chat-page__main">
        {activeSection === "conversations" ? (
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
        ) : (
          <header className="chat-page__section-header">
            <div>
              <p className="chat-page__section-eyebrow">Nova Workspace</p>
              <h1 className="chat-page__section-title">
                {activeSection === "agents" ? "Agents" : "Parametres"}
              </h1>
            </div>
          </header>
        )}
        <section className="chat-page__content">
          {activeSection === "conversations" && isSearchOpen ? (
            <div className="chat-page__search">
              <input
                className="chat-page__search-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (event.shiftKey) {
                    goToPreviousSearchMatch();
                    return;
                  }
                  goToNextSearchMatch();
                }}
                placeholder="Rechercher dans cette conversation"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
              />
              <span className="chat-page__search-count">
                {searchMatches.length > 0 ? `${selectedSearchIndex + 1}/${searchMatches.length}` : "0"}
              </span>
              <div className="chat-page__search-actions">
                <button
                  className="chat-page__search-button"
                  disabled={searchMatches.length === 0}
                  onClick={goToPreviousSearchMatch}
                  type="button"
                >
                  ↑
                </button>
                <button
                  className="chat-page__search-button"
                  disabled={searchMatches.length === 0}
                  onClick={goToNextSearchMatch}
                  type="button"
                >
                  ↓
                </button>
                <button
                  className="chat-page__search-close"
                  onClick={() => setIsSearchOpen(false)}
                  type="button"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : null}
          <div className="chat-page__panel">
            {activeSection === "conversations" && activeConversation && activeConversation.messages.length > 0 ? (
              <MessageList
                messages={activeConversation.messages}
                onKillCommand={handleKillCommand}
                onOpenSettings={() => setActiveSection("settings")}
                onSubmitCommandInput={handleSubmitCommandInput}
                searchQuery={searchQuery}
                selectedMessageId={selectedSearchMessageId}
              />
            ) : activeSection === "conversations" ? (
              <EmptyState />
            ) : activeSection === "agents" ? (
              <div className="chat-page__placeholder">
                <p className="chat-page__placeholder-eyebrow">Agent selectionne</p>
                <h2 className="chat-page__placeholder-title">
                  {AGENTS.find((agent) => agent.id === activeAgentId)?.name ?? "Aucun agent"}
                </h2>
                <p className="chat-page__placeholder-text">
                  Le panneau de configuration des agents sera construit ensuite.
                </p>
              </div>
            ) : (
              <SettingsModal
                activeCategory={activeSettingsCategory}
                onSaved={(settings) => {
                  setIsPreviewMode(settings.previewMode);
                }}
              />
            )}
          </div>
        </section>
        {activeSection === "conversations" ? (
          <ChatInput isSending={isSending} onSubmit={handleSendMessage} />
        ) : null}
      </main>
    </div>
  );
}
