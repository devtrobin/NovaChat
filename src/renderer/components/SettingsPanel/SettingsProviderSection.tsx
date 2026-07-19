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
          if (event.target.value !== "openai") return;
          setDraft((current) => current ? { ...current, activeProvider: "openai" } : current);
          setStatus();
        }} value={settings.activeProvider}>
          <option value="openai">OpenAI</option>
          <option disabled value="anthropic">Anthropic (à venir)</option>
          <option disabled value="google">Google (à venir)</option>
          <option disabled value="mistral">Mistral (à venir)</option>
          <option disabled value="ollama">Ollama (à venir)</option>
          <option disabled value="lmstudio">LM Studio (à venir)</option>
        </select>
      </label>
      <p className="settings-panel__hint">OpenAI est le seul provider activable. Les autres entrées restent visibles pour la roadmap.</p>
    </div>
  );
}
