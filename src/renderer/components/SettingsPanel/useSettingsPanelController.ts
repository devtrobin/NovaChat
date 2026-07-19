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

  React.useEffect(() => {
    if (initialStatus.message) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

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
    } catch (error) {
      setStatus({
        kind: "error",
        message: getErrorMessage(error, "Le test de connexion a échoué."),
      });
      return false;
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

    setIsBusy(true);
    setStatus(createEmptyStatus());
    try {
      const savedSettings = await window.nova.settings.save(draft);
      setInitialSettings(savedSettings);
      setDraft(savedSettings);
      onSaved(savedSettings);
      setStatus({ kind: "success", message: "Paramètres enregistrés." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: getErrorMessage(error, "L'enregistrement des paramètres a échoué."),
      });
    } finally {
      setIsBusy(false);
    }
  }, [draft, onSaved]);

  const handleClearApiKey = React.useCallback(async () => {
    setIsBusy(true);
    setStatus(createEmptyStatus());
    try {
      const savedSettings = await window.nova.settings.clearOpenAIApiKey();
      setInitialSettings(savedSettings);
      setDraft(savedSettings);
      onSaved(savedSettings);
      setStatus({ kind: "success", message: "La cle API OpenAI a ete supprimee du coffre." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: getErrorMessage(error, "La suppression de la clé API a échoué."),
      });
    } finally {
      setIsBusy(false);
    }
  }, [onSaved]);

  const handleReset = React.useCallback(() => {
    if (!initialSettings) return;
    setDraft(initialSettings);
    setStatus(createEmptyStatus());
  }, [initialSettings]);

  return {
    draft,
    handleClearApiKey,
    handleConfirm,
    handleReset,
    handleTestConnection,
    isBusy,
    resetStatus,
    setDraft,
    status,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
