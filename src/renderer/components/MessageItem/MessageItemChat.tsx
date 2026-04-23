import React from "react";
import { MessageItemProps } from "./MessageItem.types";
import MessageItemHighlight from "./MessageItemHighlight";
import { formatMessageTime } from "./MessageItem.service";

type MessageItemChatProps = Pick<MessageItemProps, "isSearchMatch" | "message" | "searchQuery">;

export default function MessageItemChat({ isSearchMatch, message, searchQuery }: MessageItemChatProps) {
  const author = resolveAuthor(message);
  const [showDetails, setShowDetails] = React.useState(false);
  const isDelegation = message.from === "assistant" && (message.to === "agent" || message.to === "device");
  const isAgentReply = message.from === "agent";

  return (
    <article
      className={[
        "message-item",
        `message-item--${message.from}`,
        isDelegation ? "message-item--delegation" : "",
        isAgentReply ? "message-item--agent-reply" : "",
        isSearchMatch ? " message-item--match" : "",
      ].join(" ")}
    >
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
      {message.result && message.isExpandable ? (
        <>
          <button className="message-item__detail-toggle" onClick={() => setShowDetails((current) => !current)} type="button">
            {showDetails ? "Masquer les details techniques" : "Afficher les details techniques"}
          </button>
          {showDetails ? (
            <pre className="message-item__detail-panel">
              <MessageItemHighlight searchQuery={searchQuery} value={message.result} />
            </pre>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function resolveAuthor(message: MessageItemChatProps["message"]): string {
  if (message.from === "user") {
    return "Vous";
  }

  if (message.from === "agent") {
    return message.agentId === "diagnostic-agent"
      ? "Diagnostic"
      : message.agentId === "device-agent"
        ? "Device"
        : "Agent";
  }

  if (message.from === "assistant" && message.to === "agent") {
    return message.agentId === "diagnostic-agent"
      ? "Nova -> Diagnostic"
      : message.agentId === "device-agent"
        ? "Nova -> Device"
        : "Nova -> Agent";
  }

  if (message.from === "assistant" && message.to === "device") {
    return message.agentId === "device-agent" ? "Nova -> Device" : "Nova -> Device";
  }

  return "Nova";
}
