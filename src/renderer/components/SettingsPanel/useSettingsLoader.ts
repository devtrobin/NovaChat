import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import { createEmptyStatus } from "./SettingsPanel.service";

export function useSettingsLoader() {
  const [draft, setDraft] = React.useState<AppSettings | null>(null);
  const [initialSettings, setInitialSettings] = React.useState<AppSettings | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsBusy(true);
      try {
        const nextSettings = await window.nova.settings.load();
        if (!active) return;
        setDraft(nextSettings);
        setInitialSettings(nextSettings);
      } finally {
        if (active) setIsBusy(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  return {
    draft,
    initialSettings,
    isBusy,
    setDraft,
    setInitialSettings,
    setIsBusy,
    initialStatus: createEmptyStatus(),
  };
}
