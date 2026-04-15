import React from "react";
import EmptyState from "../EmptyState/EmptyState";
import MessageList from "../MessageList/MessageList";
import { ConversationViewProps } from "./ConversationView.types";

type ConversationMessagesProps = Pick<
  ConversationViewProps,
  | "conversation"
  | "initialScrollState"
  | "onKillCommand"
  | "onMarkConversationAsRead"
  | "onOpenSettings"
  | "onScrollStateChange"
  | "onSubmitCommandInput"
  | "searchQuery"
  | "selectedSearchMessageId"
>;

const BOTTOM_THRESHOLD = 16;

export default function ConversationMessages({
  conversation,
  initialScrollState,
  onKillCommand,
  onMarkConversationAsRead,
  onOpenSettings,
  onScrollStateChange,
  onSubmitCommandInput,
  searchQuery,
  selectedSearchMessageId,
}: ConversationMessagesProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const previousMessageCountRef = React.useRef(conversation.messages.length);
  const isAtBottomRef = React.useRef(initialScrollState?.isAtBottom ?? true);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceToBottom <= BOTTOM_THRESHOLD;
    isAtBottomRef.current = isAtBottom;
    setShowScrollToBottom(!isAtBottom);
    onScrollStateChange(conversation.id, {
      isAtBottom,
      scrollTop: container.scrollTop,
    });
    if (isAtBottom) {
      onMarkConversationAsRead(conversation.id);
    }
  }, [conversation.id, onMarkConversationAsRead, onScrollStateChange]);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      behavior,
      top: container.scrollHeight,
    });
  }, []);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (initialScrollState?.isAtBottom ?? true) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTop = initialScrollState?.scrollTop ?? 0;
    }

    updateScrollState();
  }, [conversation.id, initialScrollState, updateScrollState]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollState();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [updateScrollState]);

  React.useEffect(() => {
    const previousMessageCount = previousMessageCountRef.current;
    previousMessageCountRef.current = conversation.messages.length;
    if (conversation.messages.length <= previousMessageCount) return;
    const latestMessage = conversation.messages[conversation.messages.length - 1];
    if (!latestMessage || latestMessage.from === "user") return;
    if (!isAtBottomRef.current) return;

    scrollToBottom("smooth");
    window.requestAnimationFrame(() => {
      scrollToBottom("smooth");
      updateScrollState();
      onMarkConversationAsRead(conversation.id);
    });
  }, [conversation.id, conversation.messages, onMarkConversationAsRead, scrollToBottom, updateScrollState]);

  React.useEffect(() => {
    if (!selectedSearchMessageId) return;

    const container = containerRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-message-id="${selectedSearchMessageId}"]`);
    if (!container || !target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    window.requestAnimationFrame(() => updateScrollState());
  }, [selectedSearchMessageId, updateScrollState]);

  if (conversation.messages.length === 0) {
    return (
      <div className="conversation-view__messages conversation-view__messages--empty">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="conversation-view__messages">
      <MessageList
        containerRef={containerRef}
        messages={conversation.messages}
        onKillCommand={(commandId) => void onKillCommand(commandId)}
        onOpenSettings={onOpenSettings}
        onSubmitCommandInput={(commandId, value) => void onSubmitCommandInput(commandId, value)}
        searchQuery={searchQuery}
      />
      {showScrollToBottom ? (
        <button
          className="conversation-view__scroll-to-bottom"
          onClick={() => scrollToBottom("smooth")}
          type="button"
        >
          Aller en bas
        </button>
      ) : null}
    </div>
  );
}
