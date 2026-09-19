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
            aelExecution: {
              ...current.aelExecution,
              timeoutMs: Number(event.target.value),
            },
          } : current);
          setStatus();
        }} type="number" value={settings.aelExecution.timeoutMs} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Sortie maximale conservee (caracteres)</span>
        <input className="settings-panel__input" disabled={isBusy} max={1000000} min={10000} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            aelExecution: {
              ...current.aelExecution,
              maxOutputCharacters: Number(event.target.value),
            },
          } : current);
          setStatus();
        }} type="number" value={settings.aelExecution.maxOutputCharacters} />
      </label>
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">Traces provider</h3>
        <p className="settings-panel__section-text">Controle la conservation et la redaction des fichiers <code>apis.json</code>.</p>
      </div>
      <label className="settings-panel__checkbox">
        <input checked={settings.apiTrace.enabled} disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            apiTrace: { ...current.apiTrace, enabled: event.target.checked },
          } : current);
          setStatus();
        }} type="checkbox" />
        <span>Conserver les traces des appels provider</span>
      </label>
      <label className="settings-panel__checkbox">
        <input checked={settings.apiTrace.redactSensitiveData} disabled={isBusy || !settings.apiTrace.enabled} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            apiTrace: { ...current.apiTrace, redactSensitiveData: event.target.checked },
          } : current);
          setStatus();
        }} type="checkbox" />
        <span>Masquer automatiquement cles, tokens et mots de passe</span>
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Retention des traces (jours)</span>
        <input className="settings-panel__input" disabled={isBusy || !settings.apiTrace.enabled} max={3650} min={1} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            apiTrace: { ...current.apiTrace, retentionDays: Number(event.target.value) },
          } : current);
          setStatus();
        }} type="number" value={settings.apiTrace.retentionDays} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Entrees maximales par message</span>
        <input className="settings-panel__input" disabled={isBusy || !settings.apiTrace.enabled} max={500} min={1} onChange={(event) => {
          setDraft((current) => current ? {
            ...current,
            apiTrace: { ...current.apiTrace, maxEntriesPerMessage: Number(event.target.value) },
          } : current);
          setStatus();
        }} type="number" value={settings.apiTrace.maxEntriesPerMessage} />
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
