import React from "react";
import { MessageItemProps } from "./MessageItem.types";
import MessageItemHighlight from "./MessageItemHighlight";
import { formatMessageTime } from "./MessageItem.service";

type MessageItemChatProps = Pick<MessageItemProps, "isSearchMatch" | "message" | "searchQuery">;

export default function MessageItemChat({ isSearchMatch, message, searchQuery }: MessageItemChatProps) {
  const author = message.from === "user"
    ? "Vous"
    : message.from === "agent"
      ? message.agentId === "diagnostic-agent"
        ? "Diagnostic"
        : message.agentId === "device-agent"
          ? "Device"
          : "Agent"
      : "Nova";

  return (
    <article className={`message-item message-item--${message.from}${isSearchMatch ? " message-item--match" : ""}`}>
      <div className="message-item__header">
        <span className="message-item__author">{author}</span>
        <span className="message-item__meta">{formatMessageTime(message.createdAt)}</span>
      </div>
      <p className="message-item__content">
        <MessageItemHighlight searchQuery={searchQuery} value={message.content} />
        {message.from === "assistant" && message.status === "streaming" ? (
          <span className="message-item__cursor">▌</span>
        ) : null}
      </p>
    </article>
  );
}
