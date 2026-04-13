import React from "react";
import MessageItem from "../MessageItem/MessageItem";
import { MessageListProps } from "./MessageList.types";
import "./MessageList.css";

export default function MessageList({
  messages,
  onKillCommand,
  onOpenSettings,
  onSubmitCommandInput,
  searchQuery,
  selectedMessageId,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (selectedMessageId) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, selectedMessageId]);

  React.useEffect(() => {
    if (!selectedMessageId) return;
    const container = containerRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-message-id="${selectedMessageId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedMessageId]);

  return (
    <section className="message-list" ref={containerRef}>
      {messages.map((message) => (
        <div className="message-list__item" data-message-id={message.id} key={message.id}>
          <MessageItem
            isSearchMatch={Boolean(searchQuery && matchesMessageSearch(message, searchQuery))}
            message={message}
            onKillCommand={onKillCommand}
            onOpenSettings={onOpenSettings}
            onSubmitCommandInput={onSubmitCommandInput}
            searchQuery={searchQuery}
          />
        </div>
      ))}
    </section>
  );
}

function matchesMessageSearch(message: MessageListProps["messages"][number], query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;

  return [message.content, message.result]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}
