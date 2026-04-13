import React from "react";
import { formatMessageTime } from "./MessageItem.service";
import { MessageItemProps } from "./MessageItem.types";
import "./MessageItem.css";

export default function MessageItem({
  isSearchMatch,
  message,
  onKillCommand,
  onOpenSettings,
  onSubmitCommandInput,
  searchQuery,
}: MessageItemProps) {
  const [showResult, setShowResult] = React.useState(false);
  const [commandInput, setCommandInput] = React.useState("");
  const executionMetadata = React.useMemo(() => {
    return [...(message.lifecycleLog ?? [])]
      .reverse()
      .find((entry) => entry.event === "device-finished" || entry.event === "device-killed")?.metadata;
  }, [message.lifecycleLog]);

  const renderHighlightedText = React.useCallback((value: string) => {
    const query = searchQuery?.trim();
    if (!query) return value;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(${escaped})`, "gi");
    const segments = value.split(pattern);

    return segments.map((segment, index) => (
      segment.toLowerCase() === query.toLowerCase() ? (
        <mark className="message-item__highlight" key={`${segment}-${index}`}>{segment}</mark>
      ) : (
        <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
      )
    ));
  }, [searchQuery]);

  if (message.from === "system") {
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

  if (message.to === "device" || message.from === "device") {
    const isRunningCommand = message.to === "device" && message.status === "running";
    const isWaitingForInput = message.to === "device" && message.status === "waiting-input";
    const statusLabel = isWaitingForInput
      ? "input"
      : isRunningCommand
        ? "running"
        : message.status ?? "idle";
    const fromLabel = message.from === "user"
      ? "user command"
      : message.from === "device"
        ? "device result"
        : "device command";

    return (
      <article className={`message-item message-item--device${isSearchMatch ? " message-item--match" : ""}`}>
        <div className="message-item__console-bar">
          <div className="message-item__console-head">
            <span className="message-item__console-label">{fromLabel}</span>
            <span className={`message-item__console-status-pill message-item__console-status-pill--${statusLabel}`}>
              {statusLabel}
            </span>
          </div>
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
        <pre className="message-item__console-command">{renderHighlightedText(message.content)}</pre>
        {executionMetadata ? (
          <div className="message-item__console-details">
            {"code" in executionMetadata ? <span>exit {String(executionMetadata.code)}</span> : null}
            {"durationMs" in executionMetadata && formatDuration(executionMetadata.durationMs)
              ? <span>{formatDuration(executionMetadata.durationMs)}</span>
              : null}
            {"shell" in executionMetadata ? <span>{String(executionMetadata.shell)}</span> : null}
            {"cwd" in executionMetadata ? <span>{String(executionMetadata.cwd)}</span> : null}
          </div>
        ) : null}
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
            {showResult ? <pre className="message-item__console-result">{renderHighlightedText(message.result)}</pre> : null}
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
    <article className={`message-item message-item--${message.from}${isSearchMatch ? " message-item--match" : ""}`}>
      <div className="message-item__header">
        <span className="message-item__author">{message.from === "user" ? "Vous" : "Nova"}</span>
        <span className="message-item__meta">{formatMessageTime(message.createdAt)}</span>
      </div>
      <p className="message-item__content">
        {renderHighlightedText(message.content)}
        {message.from === "assistant" && message.status === "streaming" ? (
          <span className="message-item__cursor">▌</span>
        ) : null}
      </p>
    </article>
  );
}

function formatDuration(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}
