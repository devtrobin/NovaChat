import React from "react";
import MessageItem from "../MessageItem/MessageItem";
import { MessageListProps } from "./MessageList.types";
import "./MessageList.css";

export default function MessageList({
  messages,
  onKillCommand,
  onOpenSettings,
  onSubmitCommandInput,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <section className="message-list" ref={containerRef}>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onKillCommand={onKillCommand}
          onOpenSettings={onOpenSettings}
          onSubmitCommandInput={onSubmitCommandInput}
        />
      ))}
    </section>
  );
}
