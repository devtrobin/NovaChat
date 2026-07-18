import { AppSettings } from "../../../shared/settings.types";
import { SettingsCategory } from "../../services/workspace/workspace.types";

export type SettingsPanelStatus = {
  kind: "error" | "idle" | "success";
  message: string;
};

export function createEmptyStatus(): SettingsPanelStatus {
  return { kind: "idle", message: "" };
}

export function validateSettingsDraft(settings: AppSettings, category: SettingsCategory): string | null {
  if (category === "local-files") {
    if (!settings.localFiles.settingsPath.trim()) {
      return "Le chemin du fichier de configuration est requis.";
    }

    if (!settings.localFiles.conversationsDirectory.trim()) {
      return "Le dossier des conversations est requis.";
    }

    if (
      !Number.isInteger(settings.deviceExecution.timeoutMs)
      || settings.deviceExecution.timeoutMs < 1_000
      || settings.deviceExecution.timeoutMs > 300_000
    ) {
      return "Le delai maximal doit etre compris entre 1 000 et 300 000 ms.";
    }

    if (
      !Number.isInteger(settings.deviceExecution.maxOutputCharacters)
      || settings.deviceExecution.maxOutputCharacters < 10_000
      || settings.deviceExecution.maxOutputCharacters > 1_000_000
    ) {
      return "La sortie maximale doit etre comprise entre 10 000 et 1 000 000 caracteres.";
    }

    return null;
  }

  if (category !== "openai") {
    return null;
  }

  if (!settings.openai.apiKey.trim()) {
    return "La cle API OpenAI est requise.";
  }

  if (!settings.openai.model.trim()) {
    return "Le nom du modele OpenAI est requis.";
  }

  if (!settings.openai.baseUrl.trim()) {
    return "La base URL OpenAI est requise.";
  }

  return null;
}

export function getProviderTitle(category: Exclude<SettingsCategory, "local-files" | "provider" | "openai">): string {
  switch (category) {
    case "anthropic":
      return "Anthropic";
    case "google":
      return "Google";
    case "mistral":
      return "Mistral";
    case "ollama":
      return "Ollama";
    case "lmstudio":
      return "LM Studio";
    default:
      return "Provider";
  }
}
