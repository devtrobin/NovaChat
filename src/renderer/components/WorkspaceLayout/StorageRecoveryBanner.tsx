import React from "react";
import { StorageRecoveryNotice } from "../../../shared/chat.types";

type StorageRecoveryBannerProps = {
  notice: StorageRecoveryNotice;
  onAcknowledge: () => Promise<void>;
};

export default function StorageRecoveryBanner({
  notice,
  onAcknowledge,
}: StorageRecoveryBannerProps) {
  const [isBusy, setIsBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  async function handleAcknowledge() {
    setIsBusy(true);
    setErrorMessage("");
    try {
      await onAcknowledge();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "La reprise des sauvegardes a echoue.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <aside className="workspace-layout__storage-warning" role="alert">
      <div>
        <strong>Récupération de stockage requise</strong>
        <p>{notice.message}</p>
        <details>
          <summary>Voir les {notice.issues.length} anomalie{notice.issues.length > 1 ? "s" : ""}</summary>
          <ul>
            {notice.issues.map((issue) => (
              <li key={`${issue.kind}-${issue.filePath}`}>
                <code>{issue.filePath}</code> — {issue.message}
                {issue.backupPath ? <> Copie conservée : <code>{issue.backupPath}</code>.</> : null}
              </li>
            ))}
          </ul>
        </details>
      </div>
      {errorMessage ? <p className="settings-panel__status settings-panel__status--error">{errorMessage}</p> : null}
      <button
        disabled={isBusy}
        onClick={() => void handleAcknowledge()}
        type="button"
      >
        {isBusy ? "Reprise..." : "Autoriser les sauvegardes"}
      </button>
    </aside>
  );
}
