import React from "react";
import { AppSettings } from "../../../shared/settings.types";

type SettingsOpenAISectionProps = {
  isBusy: boolean;
  onTestConnection: () => void;
  setDraft: React.Dispatch<React.SetStateAction<AppSettings | null>>;
  setStatus: () => void;
  settings: AppSettings;
};

export default function SettingsOpenAISection({
  isBusy,
  onTestConnection,
  setDraft,
  setStatus,
  settings,
}: SettingsOpenAISectionProps) {
  return (
    <div className="settings-panel__form">
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">OpenAI</h3>
        <p className="settings-panel__section-text">Configure la connexion API OpenAI utilisee par l&apos;orchestrateur Electron.</p>
      </div>
      <label className="settings-panel__field">
        <span className="settings-panel__label">OpenAI API Key</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, openai: { ...current.openai, apiKey: event.target.value } } : current);
          setStatus();
        }} type="password" value={settings.openai.apiKey} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Model</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, openai: { ...current.openai, model: event.target.value } } : current);
          setStatus();
        }} placeholder="gpt-5.1-mini" type="text" value={settings.openai.model} />
      </label>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Base URL</span>
        <input className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, openai: { ...current.openai, baseUrl: event.target.value } } : current);
          setStatus();
        }} placeholder="https://api.openai.com/v1" type="text" value={settings.openai.baseUrl} />
      </label>
      <div className="settings-panel__actions">
        <button className="settings-panel__test" disabled={isBusy} onClick={onTestConnection} type="button">
          Tester la connexion
        </button>
      </div>
    </div>
  );
}
