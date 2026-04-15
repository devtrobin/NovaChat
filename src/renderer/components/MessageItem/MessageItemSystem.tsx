import React from "react";
import { MessageItemProps } from "./MessageItem.types";

type MessageItemSystemProps = Pick<MessageItemProps, "message" | "onOpenSettings" | "onSubmitPermissionDecision">;

export default function MessageItemSystem({ message, onOpenSettings, onSubmitPermissionDecision }: MessageItemSystemProps) {
  const actions = message.actions ?? [];
  const isPermissionRequest = actions.length > 0;
  const [title, ...restLines] = message.content.split("\n");
  const detailLines = isPermissionRequest ? restLines.filter((line) => line.trim()) : [];
  const command = isPermissionRequest ? detailLines[detailLines.length - 1] ?? "" : "";
  const details = isPermissionRequest ? detailLines.slice(0, -1).join("\n") : "";

  return (
    <article className={`message-item message-item--system${isPermissionRequest ? " message-item--system-card" : ""}`}>
      <div className="message-item__system-line">
        <div className="message-item__system-copy">
          <p className="message-item__system-text">{title}</p>
          {details ? <p className="message-item__system-detail">{details}</p> : null}
          {command ? <pre className="message-item__system-command">{command}</pre> : null}
        </div>
        {message.actionType === "open-settings" ? (
          <button className="message-item__system-action" onClick={onOpenSettings} type="button">
            {message.actionLabel ?? "Ouvrir"}
          </button>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="message-item__system-actions">
          {actions.map((action) => {
            if (!action.payload?.requestId) return null;
            const decision = action.id === "permission-allow"
              ? "allow"
              : action.id === "permission-allow-always"
                ? "allow-always"
                : action.id === "permission-deny"
                  ? "deny"
                  : null;
            if (!decision) return null;

            return (
              <button
                key={`${message.id}-${action.id}`}
                className="message-item__system-chip"
                onClick={() => onSubmitPermissionDecision?.({ decision, requestId: action.payload?.requestId ?? "" })}
                type="button"
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
