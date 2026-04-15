import React from "react";
import MessageItem from "../MessageItem/MessageItem";
import { MessageListProps } from "./MessageList.types";
import "./MessageList.css";

export default function MessageList({
  containerRef,
  messages,
  onKillCommand,
  onOpenSettings,
  onSubmitCommandInput,
  searchQuery,
}: MessageListProps) {
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
