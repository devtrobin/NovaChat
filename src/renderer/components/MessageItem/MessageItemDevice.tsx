import React from "react";
import MessageItemHighlight from "./MessageItemHighlight";
import { MessageItemProps } from "./MessageItem.types";
import {
  formatDuration,
  formatMessageTime,
  getExecutionMetadata,
} from "./MessageItem.service";

type MessageItemDeviceProps = Pick<
  MessageItemProps,
  "isSearchMatch" | "message" | "onKillCommand" | "onSubmitCommandInput" | "searchQuery"
>;

export default function MessageItemDevice({
  isSearchMatch,
  message,
  onKillCommand,
  onSubmitCommandInput,
  searchQuery,
}: MessageItemDeviceProps) {
  const [showResult, setShowResult] = React.useState(false);
  const [commandInput, setCommandInput] = React.useState("");
  const executionMetadata = React.useMemo(() => getExecutionMetadata(message), [message]);
  const commandId = message.commandId;
  const isRunningCommand = message.to === "device" && message.status === "running";
  const isWaitingForInput = message.to === "device" && message.status === "waiting-input";
  const statusLabel = isWaitingForInput ? "input" : isRunningCommand ? "running" : message.status ?? "idle";
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
          {isRunningCommand && commandId ? (
            <button className="message-item__console-kill" onClick={() => onKillCommand?.(commandId)} type="button">
              ×
            </button>
          ) : null}
        </div>
      </div>
      <pre className="message-item__console-command"><MessageItemHighlight searchQuery={searchQuery} value={message.content} /></pre>
      {executionMetadata ? (
        <div className="message-item__console-details">
          {"code" in executionMetadata ? <span>exit {String(executionMetadata.code)}</span> : null}
          {"durationMs" in executionMetadata && formatDuration(executionMetadata.durationMs) ? <span>{formatDuration(executionMetadata.durationMs)}</span> : null}
          {"shell" in executionMetadata ? <span>{String(executionMetadata.shell)}</span> : null}
          {"cwd" in executionMetadata ? <span>{String(executionMetadata.cwd)}</span> : null}
        </div>
      ) : null}
      {isWaitingForInput && commandId ? (
        <form
          className="message-item__console-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!commandInput) return;
            onSubmitCommandInput?.(commandId, commandInput);
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
          <button className="message-item__console-submit" type="submit">Envoyer</button>
        </form>
      ) : null}
      {message.from === "device" && message.isExpandable && message.result ? (
        <>
          <button className="message-item__console-toggle" onClick={() => setShowResult((current) => !current)} type="button">
            {showResult ? "Masquer le resultat" : "Afficher le resultat"}
          </button>
          {showResult ? (
            <pre className="message-item__console-result">
              <MessageItemHighlight searchQuery={searchQuery} value={message.result} />
            </pre>
          ) : null}
        </>
      ) : null}
      {isRunningCommand ? <p className="message-item__console-status">Execution en cours...</p> : null}
      {isWaitingForInput ? <p className="message-item__console-status">Saisie requise pour continuer la commande.</p> : null}
    </article>
  );
}
