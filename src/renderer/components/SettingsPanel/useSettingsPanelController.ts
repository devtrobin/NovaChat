import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import {
  SettingsPanelStatus,
  createEmptyStatus,
  validateSettingsDraft,
} from "./SettingsPanel.service";
import { useSettingsLoader } from "./useSettingsLoader";

type UseSettingsPanelControllerArgs = {
  onSaved: (settings: AppSettings) => void;
};

export function useSettingsPanelController({
  onSaved,
}: UseSettingsPanelControllerArgs) {
  const {
    draft,
    initialSettings,
    initialStatus,
    isBusy,
    setDraft,
    setInitialSettings,
    setIsBusy,
  } = useSettingsLoader();
  const [status, setStatus] = React.useState<SettingsPanelStatus>(initialStatus);

  const resetStatus = React.useCallback(() => {
    setStatus(createEmptyStatus());
  }, []);

  const handleTestConnection = React.useCallback(async () => {
    if (!draft) return false;
    const validationError = validateSettingsDraft(draft, "openai");
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return false;
    }

    setIsBusy(true);
    setStatus(createEmptyStatus());
    try {
      const result = await window.nova.settings.test(draft);
      setStatus({ kind: result.ok ? "success" : "error", message: result.message });
      return result.ok;
    } finally {
      setIsBusy(false);
    }
  }, [draft]);

  const handleConfirm = React.useCallback(async () => {
    if (!draft) return;

    const localFilesError = validateSettingsDraft(draft, "local-files");
    if (localFilesError) {
      setStatus({ kind: "error", message: localFilesError });
      return;
    }

    if (draft.activeProvider === "openai") {
      const isValid = await handleTestConnection();
      if (!isValid) return;
    }

    setIsBusy(true);
    try {
      const savedSettings = await window.nova.settings.save(draft);
      setInitialSettings(savedSettings);
      setDraft(savedSettings);
      onSaved(savedSettings);
    } finally {
      setIsBusy(false);
    }
  }, [draft, handleTestConnection, onSaved]);

  const handleReset = React.useCallback(() => {
    if (!initialSettings) return;
    setDraft(initialSettings);
    setStatus(createEmptyStatus());
  }, [initialSettings]);

  return {
    draft,
    handleConfirm,
    handleReset,
    handleTestConnection,
    isBusy,
    resetStatus,
    setDraft,
    status,
  };
}
