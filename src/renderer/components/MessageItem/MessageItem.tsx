import React from "react";
import { formatMessageTime } from "./MessageItem.service";
import { MessageItemProps } from "./MessageItem.types";
import "./MessageItem.css";

export default function MessageItem({
  message,
  onKillCommand,
  onOpenSettings,
  onSubmitCommandInput,
}: MessageItemProps) {
  const [showResult, setShowResult] = React.useState(false);
  const [commandInput, setCommandInput] = React.useState("");

  if (message.from === "system") {
    return (
      <article className="message-item message-item--system">
        <div className="message-item__system-header">
          <span className="message-item__system-label">Systeme</span>
          {message.actionType === "open-settings" ? (
            <button className="message-item__system-action" onClick={onOpenSettings} type="button">
              {message.actionLabel ?? "Ouvrir"}
            </button>
          ) : null}
        </div>
        <p className="message-item__system-text">{message.content}</p>
      </article>
    );
  }

  if (message.to === "device" || message.from === "device") {
    const isRunningCommand = message.to === "device" && message.status === "running";
    const isWaitingForInput = message.to === "device" && message.status === "waiting-input";
    const displayOutput = message.to === "device" ? message.result?.trim() : "";

    return (
      <article className="message-item message-item--device">
        <div className="message-item__console-bar">
          <span className="message-item__console-label">
            {message.from === "device" ? "device result" : "device command"}
          </span>
          <div className="message-item__console-actions">
            <span className="message-item__meta">{formatMessageTime(message.createdAt)}</span>
            {isRunningCommand && message.commandId ? (
              <button
                className="message-item__console-kill"
                onClick={() => onKillCommand?.(message.commandId as string)}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
        <pre className="message-item__console-command">{message.content}</pre>
        {displayOutput ? <pre className="message-item__console-result">{message.result}</pre> : null}
        {isWaitingForInput && message.commandId ? (
          <form
            className="message-item__console-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              const value = commandInput;
              if (!value) return;
              onSubmitCommandInput?.(message.commandId as string, value);
              setCommandInput("");
            }}
          >
            <input
              className="message-item__console-input"
              onChange={(event) => setCommandInput(event.target.value)}
              placeholder={message.inputPlaceholder ?? "Entrez la valeur demandee"}
              type={message.inputSecret ? "password" : "text"}
              value={commandInput}
            />
            <button className="message-item__console-submit" type="submit">
              Envoyer
            </button>
          </form>
        ) : null}
        {message.from === "device" && message.isExpandable && message.result ? (
          <>
            <button
              className="message-item__console-toggle"
              onClick={() => setShowResult((current) => !current)}
              type="button"
            >
              {showResult ? "Masquer le resultat" : "Afficher le resultat"}
            </button>
            {showResult ? <pre className="message-item__console-result">{message.result}</pre> : null}
          </>
        ) : null}
        {isRunningCommand ? (
          <p className="message-item__console-status">Execution en cours...</p>
        ) : null}
        {isWaitingForInput ? (
          <p className="message-item__console-status">Saisie requise pour continuer la commande.</p>
        ) : null}
      </article>
    );
  }

  return (
    <article className={`message-item message-item--${message.from}`}>
      <div className="message-item__header">
        <span className="message-item__author">{message.from === "user" ? "Vous" : "Nova"}</span>
        <span className="message-item__meta">{formatMessageTime(message.createdAt)}</span>
      </div>
      <p className="message-item__content">
        {message.content}
        {message.from === "assistant" && message.status === "streaming" ? (
          <span className="message-item__cursor">▌</span>
        ) : null}
      </p>
    </article>
  );
}
