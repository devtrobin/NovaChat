import React from "react";
import { SettingsPanelProps } from "./SettingsPanel.types";
import {
  SettingsLocalFilesSection,
  SettingsOpenAISection,
  SettingsProviderPlaceholder,
  SettingsProviderSection,
} from "./SettingsPanel.sections";
import { useSettingsPanelController } from "./useSettingsPanelController";
import "./SettingsPanel.css";

export default function SettingsPanel({ activeCategory, onSaved }: SettingsPanelProps) {
  const {
    draft,
    handleConfirm,
    handleReset,
    handleTestConnection,
    isBusy,
    resetStatus,
    setDraft,
    status,
  } = useSettingsPanelController({ onSaved });

  if (!draft) {
    return <section className="settings-panel"><div className="settings-panel__loading">Chargement des parametres...</div></section>;
  }

  return (
    <section className="settings-panel" aria-label="Parametres">
      <header className="settings-panel__header">
        <h2 className="settings-panel__title">Parametres</h2>
      </header>
      <div className="settings-panel__body">
        <div className="settings-panel__panel">
          {activeCategory === "local-files" ? <SettingsLocalFilesSection isBusy={isBusy} setDraft={setDraft} setStatus={resetStatus} settings={draft} /> : null}
          {activeCategory === "provider" ? <SettingsProviderSection isBusy={isBusy} setDraft={setDraft} setStatus={resetStatus} settings={draft} /> : null}
          {activeCategory === "openai" ? <SettingsOpenAISection isBusy={isBusy} onTestConnection={() => void handleTestConnection()} setDraft={setDraft} setStatus={resetStatus} settings={draft} /> : null}
          {!["local-files", "provider", "openai"].includes(activeCategory) ? (
            <SettingsProviderPlaceholder activeCategory={activeCategory as Exclude<typeof activeCategory, "local-files" | "provider" | "openai">} />
          ) : null}
          {status.message ? <p className={`settings-panel__status settings-panel__status--${status.kind}`}>{status.message}</p> : null}
        </div>
      </div>
      <footer className="settings-panel__footer">
        <button className="settings-panel__cancel" disabled={isBusy} onClick={handleReset} type="button">
          Annuler
        </button>
        <button className="settings-panel__confirm" disabled={isBusy} onClick={() => void handleConfirm()} type="button">
          Valider
        </button>
      </footer>
    </section>
  );
}
