import React from "react";
import { SettingsCategory } from "../../services/workspace/workspace.types";
import { getProviderTitle } from "./SettingsPanel.service";

type SettingsProviderPlaceholderProps = {
  activeCategory: Exclude<SettingsCategory, "local-files" | "provider" | "openai">;
};

export default function SettingsProviderPlaceholder({ activeCategory }: SettingsProviderPlaceholderProps) {
  const providerTitle = getProviderTitle(activeCategory);

  return (
    <div className="settings-panel__form">
      <div className="settings-panel__section-head">
        <h3 className="settings-panel__section-title">{providerTitle}</h3>
        <p className="settings-panel__section-text">Cette page de configuration sera construite ensuite.</p>
      </div>
      <p className="settings-panel__hint">
        Le provider {providerTitle} est visible uniquement en mode preview pour preparer l&apos;architecture multi-provider.
      </p>
    </div>
  );
}
