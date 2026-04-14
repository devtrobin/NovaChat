import React from "react";
import { AppSettings } from "../../../shared/settings.types";

type SettingsProviderSectionProps = {
  isBusy: boolean;
  setDraft: React.Dispatch<React.SetStateAction<AppSettings | null>>;
  setStatus: () => void;
  settings: AppSettings;
};

export default function SettingsProviderSection({
  isBusy,
  setDraft,
  setStatus,
  settings,
}: SettingsProviderSectionProps) {
  return (
    <div className="settings-panel__form">
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">Provider</h3>
        <p className="settings-panel__section-text">Choisis le provider par defaut utilise par Nova pour les conversations et les futurs agents.</p>
      </div>
      <label className="settings-panel__field">
        <span className="settings-panel__label">Provider par defaut</span>
        <select className="settings-panel__input" disabled={isBusy} onChange={(event) => {
          setDraft((current) => current ? { ...current, activeProvider: event.target.value as AppSettings["activeProvider"] } : current);
          setStatus();
        }} value={settings.activeProvider}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
          <option value="mistral">Mistral</option>
          <option value="ollama">Ollama</option>
          <option value="lmstudio">LM Studio</option>
        </select>
      </label>
      <p className="settings-panel__hint">OpenAI est actuellement le seul provider entierement configure. Les autres entrees sont preparees pour la suite.</p>
    </div>
  );
}
