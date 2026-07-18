import React from "react";
import { AppSettings } from "../../../shared/settings.types";

type SettingsLocalFilesSectionProps = {
  isBusy: boolean;
  setDraft: React.Dispatch<React.SetStateAction<AppSettings | null>>;
  setStatus: () => void;
  settings: AppSettings;
};

export default function SettingsLocalFilesSection({
  isBusy,
  setDraft,
  setStatus,
  settings,
}: SettingsLocalFilesSectionProps) {
  return (
    <div className="settings-panel__form">
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">Fichier local</h3>
        <p className="settings-panel__section-text">Definis ou Nova enregistre les conversations, les agents et la configuration active.</p>
      </div>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Fichier de configuration</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, localFiles: { ...current.localFiles, settingsPath: event.target.value } } : current);
          setStatus();
        }} placeholder="/chemin/vers/settings.json" type="text" value={settings.localFiles.settingsPath} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Dossier des conversations</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, localFiles: { ...current.localFiles, conversationsDirectory: event.target.value } } : current);
          setStatus();
        }} placeholder="/chemin/vers/dossier-conversations" type="text" value={settings.localFiles.conversationsDirectory} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Dossier des agents</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, localFiles: { ...current.localFiles, agentsDirectory: event.target.value } } : current);
          setStatus();
        }} placeholder="/chemin/vers/dossier-agents" type="text" value={settings.localFiles.agentsDirectory} />
      </label>
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">Execution locale</h3>
        <p className="settings-panel__section-text">Encadre la duree et la quantite de sortie conservee pour chaque commande.</p>
      </div>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Delai maximal actif (millisecondes)</span>
        <input className="settings-panel__input" disabled={isBusy} max={300000} min={1000} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            deviceExecution: {
              ...current.deviceExecution,
              timeoutMs: Number(event.target.value),
            },
          } : current);
          setStatus();
        }} type="number" value={settings.deviceExecution.timeoutMs} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Sortie maximale conservee (caracteres)</span>
        <input className="settings-panel__input" disabled={isBusy} max={1000000} min={10000} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            deviceExecution: {
              ...current.deviceExecution,
              maxOutputCharacters: Number(event.target.value),
            },
          } : current);
          setStatus();
        }} type="number" value={settings.deviceExecution.maxOutputCharacters} />
      </label>
      <label className="settings-panel__checkbox">
        <input checked={settings.previewMode} disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, previewMode: event.target.checked } : current);
          setStatus();
        }} type="checkbox" />
        <span>Mode preview</span>
      </label>
      <label className="settings-panel__checkbox">
        <input checked={!settings.hideInternalConversations} disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, hideInternalConversations: !event.target.checked } : current);
          setStatus();
        }} type="checkbox" />
        <span>Afficher les conversations internes assistant ↔ agents</span>
      </label>
      <p className="settings-panel__hint">Nova conserve un point d&apos;ancrage local pour retrouver la configuration au redemarrage.</p>
    </div>
  );
}
