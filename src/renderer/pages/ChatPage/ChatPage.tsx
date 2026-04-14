import React from "react";
import ChatInput from "../../components/ChatInput/ChatInput";
import EmptyState from "../../components/EmptyState/EmptyState";
import MessageList from "../../components/MessageList/MessageList";
import TopBar from "../../components/TopBar/TopBar";
import ChatSearchBar from "./ChatSearchBar";
import { ChatPageProps } from "./ChatPage.types";
import { useConversationSearch } from "./useConversationSearch";
import "./ChatPage.css";

export default function ChatPage({
  activeConversation,
  isSending,
  onDeleteConversation,
  onKillCommand,
  onOpenSettings,
  onRenameConversation,
  onSendMessage,
  onSubmitCommandInput,
}: ChatPageProps) {
  const {
    goToNextSearchMatch,
    goToPreviousSearchMatch,
    isSearchOpen,
    searchInputRef,
    searchMatches,
    searchQuery,
    selectedSearchIndex,
    selectedSearchMessageId,
    setIsSearchOpen,
    setSearchQuery,
  } = useConversationSearch(activeConversation);

  return (
    <section className="chat-page">
      <TopBar
        isDeletable={Boolean(activeConversation)}
        isEditable={Boolean(activeConversation)}
        onDelete={() => activeConversation && onDeleteConversation(activeConversation.id)}
        onRename={(value) => activeConversation && onRenameConversation(activeConversation.id, value)}
        title={activeConversation?.title ?? "Nova Chat"}
      />
      <section className="chat-page__content">
        {isSearchOpen ? (
          <ChatSearchBar
            onClose={() => setIsSearchOpen(false)}
            onNext={goToNextSearchMatch}
            onPrevious={goToPreviousSearchMatch}
            onQueryChange={setSearchQuery}
            query={searchQuery}
            resultCount={searchMatches.length}
            searchInputRef={searchInputRef}
            selectedIndex={selectedSearchIndex}
          />
        ) : null}
        <div className="chat-page__panel">
          {activeConversation && activeConversation.messages.length > 0 ? (
            <MessageList
              messages={activeConversation.messages}
              onKillCommand={(commandId) => void onKillCommand(commandId)}
              onOpenSettings={onOpenSettings}
              onSubmitCommandInput={(commandId, value) => void onSubmitCommandInput(commandId, value)}
              searchQuery={searchQuery}
              selectedMessageId={selectedSearchMessageId}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
      <ChatInput isSending={isSending} onSubmit={onSendMessage} />
    </section>
  );
}
