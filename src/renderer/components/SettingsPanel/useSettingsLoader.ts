import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import { createEmptyStatus } from "./SettingsPanel.service";

export function useSettingsLoader() {
  const [draft, setDraft] = React.useState<AppSettings | null>(null);
  const [initialSettings, setInitialSettings] = React.useState<AppSettings | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [initialStatus, setInitialStatus] = React.useState(createEmptyStatus());

  React.useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsBusy(true);
      try {
        const nextSettings = await window.nova.settings.load();
        if (!active) return;
        setDraft(nextSettings);
        setInitialSettings(nextSettings);
      } catch (error) {
        if (!active) return;
        setInitialStatus({
          kind: "error",
          message: error instanceof Error && error.message.trim()
            ? error.message
            : "Le chargement des paramètres a échoué.",
        });
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
    initialStatus,
  };
}
