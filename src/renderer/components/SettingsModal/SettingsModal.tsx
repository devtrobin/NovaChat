import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import { SettingsModalProps } from "./SettingsModal.types";
import "./SettingsModal.css";

type SettingsCategory = "local-files" | "openai";

type StatusState = {
  kind: "error" | "idle" | "success";
  message: string;
};

function createEmptyStatus() {
  return { kind: "idle", message: "" } satisfies StatusState;
}

function validateDraft(settings: AppSettings, category: SettingsCategory): string | null {
  if (category === "local-files") {
    if (!settings.localFiles.settingsPath.trim()) {
      return "Le chemin du fichier de configuration est requis.";
    }

    if (!settings.localFiles.conversationsDirectory.trim()) {
      return "Le dossier des conversations est requis.";
    }

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

export default function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = React.useState<SettingsCategory>("local-files");
  const [draft, setDraft] = React.useState<AppSettings | null>(null);
  const [status, setStatus] = React.useState<StatusState>(createEmptyStatus());
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadSettings() {
      setIsBusy(true);
      setStatus(createEmptyStatus());
      setActiveCategory("local-files");
      try {
        const nextSettings = await window.nova.settings.load();
        if (!active) return;
        setDraft(nextSettings);
      } finally {
        if (active) setIsBusy(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSettings = draft;

  async function handleTestConnection() {
    if (!currentSettings) return;

    const validationError = validateDraft(currentSettings, "openai");
    if (validationError) {
      setActiveCategory("openai");
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
      setActiveCategory("local-files");
      setStatus({
        kind: "error",
        message: localFilesError,
      });
      return;
    }

    const isValid = await handleTestConnection();
    if (!isValid) return;

    setIsBusy(true);
    try {
      const savedSettings = await window.nova.settings.save(currentSettings);
      onSaved(savedSettings);
      onClose();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Parametres">
      <button className="settings-modal__backdrop" onClick={onClose} type="button" />
      <section className="settings-modal__dialog">
        <header className="settings-modal__header">
          <h2 className="settings-modal__title">⚙ Parametres</h2>
          <button className="settings-modal__close" onClick={onClose} type="button" aria-label="Fermer">
            ×
          </button>
        </header>
        <div className="settings-modal__body">
          {currentSettings ? (
            <div className="settings-modal__layout">
              <aside className="settings-modal__sidebar" aria-label="Categories de parametres">
                <button
                  className={`settings-modal__nav-item${activeCategory === "local-files" ? " settings-modal__nav-item--active" : ""}`}
                  onClick={() => {
                    setActiveCategory("local-files");
                    setStatus(createEmptyStatus());
                  }}
                  type="button"
                >
                  Fichier local
                </button>
                <button
                  className={`settings-modal__nav-item${activeCategory === "openai" ? " settings-modal__nav-item--active" : ""}`}
                  onClick={() => {
                    setActiveCategory("openai");
                    setStatus(createEmptyStatus());
                  }}
                  type="button"
                >
                  Open AI
                </button>
              </aside>
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
                      <span className="settings-modal__label">Fichier des conversations</span>
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
                    <p className="settings-modal__hint">
                      Nova conserve un point d'ancrage local pour retrouver la configuration au redemarrage.
                    </p>
                  </div>
                ) : (
                  <div className="settings-modal__form">
                    <div className="settings-modal__section-head">
                      <h3 className="settings-modal__section-title">Open AI</h3>
                      <p className="settings-modal__section-text">
                        Configure la connexion API OpenAI utilisee par l'orchestrateur Electron.
                      </p>
                    </div>
                    <label className="settings-modal__field">
                      <span className="settings-modal__label">Provider</span>
                      <select
                        className="settings-modal__input"
                        disabled={isBusy}
                        onChange={() => {
                          setDraft((current) => current ? { ...current, activeProvider: "openai" } : current);
                          setStatus(createEmptyStatus());
                        }}
                        value={currentSettings.activeProvider}
                      >
                        <option value="openai">OpenAI</option>
                      </select>
                    </label>
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
                )}
                {status.kind !== "idle" ? (
                  <p className={`settings-modal__status settings-modal__status--${status.kind}`}>
                    {status.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="settings-modal__text">Chargement des parametres...</p>
          )}
        </div>
        <footer className="settings-modal__footer">
          <button className="settings-modal__cancel" disabled={isBusy} onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="settings-modal__confirm"
            disabled={isBusy || !currentSettings}
            onClick={() => void handleConfirm()}
            type="button"
          >
            Valider
          </button>
        </footer>
      </section>
    </div>
  );
}
