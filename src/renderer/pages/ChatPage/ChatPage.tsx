import React from "react";
import ConversationView from "../../components/ConversationView/ConversationView";
import EmptyState from "../../components/EmptyState/EmptyState";
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
  onMarkConversationAsRead,
  onOpenSettings,
  onRenameConversation,
  onSendMessage,
  onStopTurn,
  onSubmitPermissionDecision,
  onSubmitCommandInput,
  onUpdateConversationDraft,
}: ChatPageProps) {
  const conversationScrollStatesRef = React.useRef<Record<string, { isAtBottom: boolean; scrollTop: number }>>({});
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

  const handleConversationScrollStateChange = React.useCallback((
    conversationId: string,
    nextState: { isAtBottom: boolean; scrollTop: number },
  ) => {
    conversationScrollStatesRef.current[conversationId] = nextState;
  }, []);

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
          {activeConversation ? (
            <ConversationView
              key={activeConversation.id}
              conversation={activeConversation}
              initialScrollState={conversationScrollStatesRef.current[activeConversation.id]}
              isSending={isSending}
              onKillCommand={onKillCommand}
              onMarkConversationAsRead={onMarkConversationAsRead}
              onOpenSettings={onOpenSettings}
              onScrollStateChange={handleConversationScrollStateChange}
              onSendMessage={onSendMessage}
              onStopTurn={onStopTurn}
              onSubmitPermissionDecision={onSubmitPermissionDecision}
              onSubmitCommandInput={onSubmitCommandInput}
              onUpdateDraft={onUpdateConversationDraft}
              searchQuery={searchQuery}
              selectedSearchMessageId={selectedSearchMessageId}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </section>
  );
}
