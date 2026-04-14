import React from "react";
import { MessageItemProps } from "./MessageItem.types";

type MessageItemSystemProps = Pick<MessageItemProps, "message" | "onOpenSettings">;

export default function MessageItemSystem({ message, onOpenSettings }: MessageItemSystemProps) {
  return (
    <article className="message-item message-item--system">
      <div className="message-item__system-line">
        <p className="message-item__system-text">{message.content}</p>
        {message.actionType === "open-settings" ? (
          <button className="message-item__system-action" onClick={onOpenSettings} type="button">
            {message.actionLabel ?? "Ouvrir"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
