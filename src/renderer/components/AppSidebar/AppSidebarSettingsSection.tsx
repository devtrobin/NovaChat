import React from "react";
import { AppSidebarProps } from "./AppSidebar.types";
import AppSidebarProviderItem from "./AppSidebarProviderItem";

type AppSidebarSettingsSectionProps = Pick<
  AppSidebarProps,
  "activeSection" | "activeSettingsCategory" | "isPreviewMode" | "onSelectSection" | "onSelectSettingsCategory"
> & {
  isProviderGroupOpen: boolean;
  onToggleProviderGroup: () => void;
};

export default function AppSidebarSettingsSection({
  activeSection,
  activeSettingsCategory,
  isPreviewMode,
  isProviderGroupOpen,
  onSelectSection,
  onSelectSettingsCategory,
  onToggleProviderGroup,
}: AppSidebarSettingsSectionProps) {
  return (
    <section className={`app-sidebar__section${activeSection === "settings" ? " app-sidebar__section--active" : ""}`}>
      <button className="app-sidebar__section-trigger" onClick={() => onSelectSection("settings")} type="button">
        <span>Parametres</span>
        <span className="app-sidebar__section-arrow">{activeSection === "settings" ? "−" : "+"}</span>
      </button>
      <div className="app-sidebar__section-body">
        <div className="app-sidebar__section-body-inner">
          <div className="app-sidebar__list">
            <button
              className={`app-sidebar__item ${activeSettingsCategory === "agents-activity" ? "app-sidebar__item--active" : ""}`}
              onClick={() => selectCategory("agents-activity", onSelectSection, onSelectSettingsCategory)}
              type="button"
            >
              <span className="app-sidebar__item-title">Activite des agents</span>
              <span className="app-sidebar__item-meta">Taches globales en cours et arrets rapides</span>
            </button>
            <button
              className={`app-sidebar__item ${activeSettingsCategory === "local-files" ? "app-sidebar__item--active" : ""}`}
              onClick={() => selectCategory("local-files", onSelectSection, onSelectSettingsCategory)}
              type="button"
            >
              <span className="app-sidebar__item-title">Fichier local</span>
              <span className="app-sidebar__item-meta">Chemins de stockage et mode preview</span>
            </button>
            <div className={`app-sidebar__subsection${isProviderGroupOpen ? " app-sidebar__subsection--active" : ""}`}>
              <button
                className={`app-sidebar__item app-sidebar__item--subtrigger ${activeSettingsCategory === "provider" ? "app-sidebar__item--active" : ""}`}
                onClick={() => {
                  onSelectSection("settings");
                  onToggleProviderGroup();
                }}
                type="button"
              >
                <span className="app-sidebar__item-main">
                  <span className="app-sidebar__item-title">Provider</span>
                  <span className="app-sidebar__item-meta">Selection du provider par defaut</span>
                </span>
                <span className="app-sidebar__subsection-arrow">{isProviderGroupOpen ? "−" : "+"}</span>
              </button>
              <div className="app-sidebar__subsection-body">
                <div className="app-sidebar__subsection-body-inner">
                  <div className="app-sidebar__sublist">
                    <AppSidebarProviderItem active={activeSettingsCategory === "openai"} meta="Configuration complete du provider OpenAI" name="OpenAI" onClick={() => selectCategory("openai", onSelectSection, onSelectSettingsCategory)} />
                    {isPreviewMode ? (
                      <>
                        <AppSidebarProviderItem active={activeSettingsCategory === "anthropic"} meta="Provider online en preparation" name="Anthropic" onClick={() => selectCategory("anthropic", onSelectSection, onSelectSettingsCategory)} />
                        <AppSidebarProviderItem active={activeSettingsCategory === "google"} meta="Provider online en preparation" name="Google" onClick={() => selectCategory("google", onSelectSection, onSelectSettingsCategory)} />
                        <AppSidebarProviderItem active={activeSettingsCategory === "mistral"} meta="Provider online en preparation" name="Mistral" onClick={() => selectCategory("mistral", onSelectSection, onSelectSettingsCategory)} />
                        <AppSidebarProviderItem active={activeSettingsCategory === "ollama"} meta="Provider local en preparation" name="Ollama" onClick={() => selectCategory("ollama", onSelectSection, onSelectSettingsCategory)} />
                        <AppSidebarProviderItem active={activeSettingsCategory === "lmstudio"} meta="Provider local en preparation" name="LM Studio" onClick={() => selectCategory("lmstudio", onSelectSection, onSelectSettingsCategory)} />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function selectCategory(
  category: AppSidebarProps["activeSettingsCategory"],
  onSelectSection: AppSidebarProps["onSelectSection"],
  onSelectSettingsCategory: AppSidebarProps["onSelectSettingsCategory"],
) {
  onSelectSection("settings");
  onSelectSettingsCategory(category);
}
