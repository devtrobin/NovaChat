import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import { SettingsModalProps } from "./SettingsModal.types";
import "./SettingsModal.css";

type StatusState = {
  kind: "error" | "idle" | "success";
  message: string;
};

function createEmptyStatus() {
  return { kind: "idle", message: "" } satisfies StatusState;
}

function validateDraft(settings: AppSettings, category: SettingsModalProps["activeCategory"]): string | null {
  if (category === "local-files") {
    if (!settings.localFiles.settingsPath.trim()) {
      return "Le chemin du fichier de configuration est requis.";
    }

    if (!settings.localFiles.conversationsDirectory.trim()) {
      return "Le dossier des conversations est requis.";
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

export default function SettingsModal({ activeCategory, onSaved }: SettingsModalProps) {
  const [draft, setDraft] = React.useState<AppSettings | null>(null);
  const [initialSettings, setInitialSettings] = React.useState<AppSettings | null>(null);
  const [status, setStatus] = React.useState<StatusState>(createEmptyStatus());
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsBusy(true);
      setStatus(createEmptyStatus());
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

  const currentSettings = draft;

  async function handleTestConnection() {
    if (!currentSettings) return false;

      const validationError = validateDraft(currentSettings, "openai");
      if (validationError) {
        setStatus({
          kind: "error",
          message: validationError,
      });
      return false;
    }

    setIsBusy(true);
    setStatus(createEmptyStatus());
    try {
      const result = await window.nova.settings.test(currentSettings);
      setStatus({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });
      return result.ok;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirm() {
    if (!currentSettings) return;

    const localFilesError = validateDraft(currentSettings, "local-files");
    if (localFilesError) {
      setStatus({
        kind: "error",
        message: localFilesError,
      });
      return;
    }

    if (currentSettings.activeProvider === "openai") {
      const isValid = await handleTestConnection();
      if (!isValid) return;
    }

    setIsBusy(true);
    try {
      const savedSettings = await window.nova.settings.save(currentSettings);
      setInitialSettings(savedSettings);
      setDraft(savedSettings);
      onSaved(savedSettings);
    } finally {
      setIsBusy(false);
    }
  }

  function handleReset() {
    if (!initialSettings) return;
    setDraft(initialSettings);
    setStatus(createEmptyStatus());
  }

  return (
    <section className="settings-modal" aria-label="Parametres">
      <header className="settings-modal__header">
        <h2 className="settings-modal__title">Parametres</h2>
      </header>
      {currentSettings ? (
        <>
          <div className="settings-modal__body">
            <div className="settings-modal__panel">
              {activeCategory === "local-files" ? (
                  <div className="settings-modal__form">
                    <div className="settings-modal__section-head">
                      <h3 className="settings-modal__section-title">Fichier local</h3>
                      <p className="settings-modal__section-text">
                        Definis ou Nova enregistre les conversations et la configuration active.
                      </p>
                    </div>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Fichier de configuration</span>
                      <input
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            localFiles: {
                              ...current.localFiles,
                              settingsPath: event.target.value,
                            },
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        placeholder="/chemin/vers/settings.json"
                        type="text"
                        value={currentSettings.localFiles.settingsPath}
                      />
                    </label>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Dossier des conversations</span>
                      <input
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            localFiles: {
                              ...current.localFiles,
                              conversationsDirectory: event.target.value,
                            },
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        placeholder="/chemin/vers/dossier-conversations"
                        type="text"
                        value={currentSettings.localFiles.conversationsDirectory}
                      />
                    </label>
                    <label className="settings-modal__checkbox">
                      <input
                        checked={currentSettings.previewMode}
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            previewMode: event.target.checked,
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        type="checkbox"
                      />
                      <span>Mode preview</span>
                    </label>
                    <p className="settings-modal__hint">
                      Nova conserve un point d'ancrage local pour retrouver la configuration au redemarrage.
                    </p>
                  </div>
              ) : activeCategory === "provider" ? (
                  <div className="settings-modal__form">
                    <div className="settings-modal__section-head">
                      <h3 className="settings-modal__section-title">Provider</h3>
                      <p className="settings-modal__section-text">
                        Choisis le provider par defaut utilise par Nova pour les conversations et les futurs agents.
                      </p>
                    </div>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Provider par defaut</span>
                      <select
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            activeProvider: event.target.value as AppSettings["activeProvider"],
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        value={currentSettings.activeProvider}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                        <option value="mistral">Mistral</option>
                        <option value="ollama">Ollama</option>
                        <option value="lmstudio">LM Studio</option>
                      </select>
                    </label>
                    <p className="settings-modal__hint">
                      OpenAI est actuellement le seul provider entierement configure. Les autres entrees sont preparees pour la suite.
                    </p>
                  </div>
              ) : (
                activeCategory === "openai" ? (
                  <div className="settings-modal__form">
                    <div className="settings-modal__section-head">
                      <h3 className="settings-modal__section-title">OpenAI</h3>
                      <p className="settings-modal__section-text">
                        Configure la connexion API OpenAI utilisee par l'orchestrateur Electron.
                      </p>
                    </div>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">OpenAI API Key</span>
                      <input
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            openai: {
                              ...current.openai,
                              apiKey: event.target.value,
                            },
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        type="password"
                        value={currentSettings.openai.apiKey}
                      />
                    </label>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Model</span>
                      <input
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            openai: {
                              ...current.openai,
                              model: event.target.value,
                            },
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        placeholder="gpt-5.1-mini"
                        type="text"
                        value={currentSettings.openai.model}
                      />
                    </label>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Base URL</span>
                      <input
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={(event) => {
                          setDraft((current) => current ? {
                            ...current,
                            openai: {
                              ...current.openai,
                              baseUrl: event.target.value,
                            },
                          } : current);
                          setStatus(createEmptyStatus());
                        }}
                        placeholder="https://api.openai.com/v1"
                        type="text"
                        value={currentSettings.openai.baseUrl}
                      />
                    </label>
                    <div className="settings-modal__actions">
                      <button
                        className="settings-modal__test"
                        disabled={isBusy}
                        onClick={() => void handleTestConnection()}
                        type="button"
                      >
                        Tester la connexion
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="settings-modal__form">
                    <div className="settings-modal__section-head">
                      <h3 className="settings-modal__section-title">{getProviderTitle(activeCategory)}</h3>
                      <p className="settings-modal__section-text">
                        Cette page de configuration sera construite ensuite.
                      </p>
                    </div>
                    <p className="settings-modal__hint">
                      Le provider {getProviderTitle(activeCategory)} est visible uniquement en mode preview pour preparer l'architecture multi-provider.
                    </p>
                  </div>
                )
              )}
              {status.message ? (
                <p className={`settings-modal__status settings-modal__status--${status.kind}`}>
                  {status.message}
                </p>
              ) : null}
            </div>
          </div>
          <footer className="settings-modal__footer">
            <button className="settings-modal__cancel" disabled={isBusy} onClick={handleReset} type="button">
              Annuler
            </button>
            <button className="settings-modal__confirm" disabled={isBusy} onClick={() => void handleConfirm()} type="button">
              Valider
            </button>
          </footer>
        </>
      ) : (
        <div className="settings-modal__loading">Chargement des parametres...</div>
      )}
    </section>
  );
}

function getProviderTitle(category: Exclude<SettingsModalProps["activeCategory"], "local-files" | "provider" | "openai">): string {
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
