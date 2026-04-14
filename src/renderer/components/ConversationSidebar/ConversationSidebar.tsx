import React from "react";
import { ConversationSidebarProps } from "./ConversationSidebar.types";
import "./ConversationSidebar.css";

export default function ConversationSidebar({
  activeAgentId,
  activeConversationId,
  activeSettingsCategory,
  activeSection,
  agents,
  conversationIndicators,
  conversations,
  isPreviewMode,
  onCreateConversation,
  onSelectAgent,
  onSelectConversation,
  onSelectSettingsCategory,
  onSelectSection,
}: ConversationSidebarProps) {
  const isProviderSelection = [
    "provider",
    "openai",
    "anthropic",
    "google",
    "mistral",
    "ollama",
    "lmstudio",
  ].includes(activeSettingsCategory);
  const [isProviderGroupOpen, setIsProviderGroupOpen] = React.useState(isProviderSelection);

  React.useEffect(() => {
    if (activeSection !== "settings") return;
    if (isProviderSelection) {
      setIsProviderGroupOpen(true);
    }
  }, [activeSection, isProviderSelection]);

  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar__brand">
        <p className="conversation-sidebar__eyebrow">Workspace</p>
        <h2 className="conversation-sidebar__title">Nova</h2>
      </div>

      <div className="conversation-sidebar__sections">
        <section className={`conversation-sidebar__section${activeSection === "conversations" ? " conversation-sidebar__section--active" : ""}`}>
          <button
            className="conversation-sidebar__section-trigger"
            onClick={() => onSelectSection("conversations")}
            type="button"
          >
            <span>Conversations</span>
            <span className="conversation-sidebar__section-arrow">{activeSection === "conversations" ? "−" : "+"}</span>
          </button>
          <div className="conversation-sidebar__section-body">
            <div className="conversation-sidebar__section-body-inner">
              <button className="conversation-sidebar__button" onClick={onCreateConversation} type="button">
                Nouvelle conversation
              </button>
              <div className="conversation-sidebar__list">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeConversationId;
                  const indicators = conversationIndicators[conversation.id] ?? {
                    hasRunningSystemMessage: false,
                    unreadCount: 0,
                  };
                  return (
                    <button
                      key={conversation.id}
                      className={`conversation-sidebar__item ${active ? "conversation-sidebar__item--active" : ""}${!active && indicators.hasRunningSystemMessage ? " conversation-sidebar__item--pending" : ""}`}
                      onClick={() => onSelectConversation(conversation.id)}
                      type="button"
                    >
                      <div className="conversation-sidebar__item-row">
                        <span className="conversation-sidebar__item-title">{conversation.title}</span>
                        {indicators.unreadCount > 0 ? (
                          <span className="conversation-sidebar__item-badge">{indicators.unreadCount}</span>
                        ) : null}
                      </div>
                      <div className="conversation-sidebar__item-row">
                        <span className="conversation-sidebar__item-meta">
                          {conversation.messages.length} message{conversation.messages.length > 1 ? "s" : ""}
                        </span>
                        {!active && indicators.hasRunningSystemMessage ? (
                          <span className="conversation-sidebar__item-loader" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {isPreviewMode ? (
          <section className={`conversation-sidebar__section${activeSection === "agents" ? " conversation-sidebar__section--active" : ""}`}>
            <button
              className="conversation-sidebar__section-trigger"
              onClick={() => onSelectSection("agents")}
              type="button"
            >
              <span>Agents</span>
              <span className="conversation-sidebar__section-arrow">{activeSection === "agents" ? "−" : "+"}</span>
            </button>
            <div className="conversation-sidebar__section-body">
              <div className="conversation-sidebar__section-body-inner">
                <div className="conversation-sidebar__list">
                  {agents.map((agent) => {
                    const active = agent.id === activeAgentId;
                    return (
                      <button
                        key={agent.id}
                        className={`conversation-sidebar__item ${active ? "conversation-sidebar__item--active" : ""}`}
                        onClick={() => onSelectAgent(agent.id)}
                        type="button"
                      >
                        <span className="conversation-sidebar__item-title">{agent.name}</span>
                        <span className="conversation-sidebar__item-meta">{agent.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={`conversation-sidebar__section${activeSection === "settings" ? " conversation-sidebar__section--active" : ""}`}>
          <button
            className="conversation-sidebar__section-trigger"
            onClick={() => onSelectSection("settings")}
            type="button"
          >
            <span>Parametres</span>
            <span className="conversation-sidebar__section-arrow">{activeSection === "settings" ? "−" : "+"}</span>
          </button>
          <div className="conversation-sidebar__section-body">
            <div className="conversation-sidebar__section-body-inner">
              <div className="conversation-sidebar__list">
                <button
                  className={`conversation-sidebar__item ${activeSettingsCategory === "local-files" ? "conversation-sidebar__item--active" : ""}`}
                  onClick={() => {
                    onSelectSection("settings");
                    onSelectSettingsCategory("local-files");
                  }}
                  type="button"
                >
                  <span className="conversation-sidebar__item-title">Fichier local</span>
                  <span className="conversation-sidebar__item-meta">Chemins de stockage et mode preview</span>
                </button>
                <div className={`conversation-sidebar__subsection${isProviderGroupOpen ? " conversation-sidebar__subsection--active" : ""}`}>
                  <button
                    className={`conversation-sidebar__item conversation-sidebar__item--subtrigger ${activeSettingsCategory === "provider" ? "conversation-sidebar__item--active" : ""}`}
                    onClick={() => {
                      onSelectSection("settings");
                      setIsProviderGroupOpen((current) => {
                        const next = !current;
                        if (next) {
                          onSelectSettingsCategory("provider");
                        }
                        return next;
                      });
                    }}
                    type="button"
                  >
                    <span className="conversation-sidebar__item-main">
                      <span className="conversation-sidebar__item-title">Provider</span>
                      <span className="conversation-sidebar__item-meta">Selection du provider par defaut</span>
                    </span>
                    <span className="conversation-sidebar__subsection-arrow">{isProviderGroupOpen ? "−" : "+"}</span>
                  </button>
                  <div className="conversation-sidebar__subsection-body">
                    <div className="conversation-sidebar__subsection-body-inner">
                      <div className="conversation-sidebar__sublist">
                        <button
                          className={`conversation-sidebar__subitem ${activeSettingsCategory === "openai" ? "conversation-sidebar__subitem--active" : ""}`}
                          onClick={() => {
                            onSelectSection("settings");
                            onSelectSettingsCategory("openai");
                          }}
                          type="button"
                        >
                          <span className="conversation-sidebar__item-title">OpenAI</span>
                          <span className="conversation-sidebar__item-meta">Configuration complete du provider OpenAI</span>
                        </button>
                        {isPreviewMode ? (
                          <>
                            <button
                              className={`conversation-sidebar__subitem ${activeSettingsCategory === "anthropic" ? "conversation-sidebar__subitem--active" : ""}`}
                              onClick={() => {
                                onSelectSection("settings");
                                onSelectSettingsCategory("anthropic");
                              }}
                              type="button"
                            >
                              <span className="conversation-sidebar__item-title">Anthropic</span>
                              <span className="conversation-sidebar__item-meta">Provider online en preparation</span>
                            </button>
                            <button
                              className={`conversation-sidebar__subitem ${activeSettingsCategory === "google" ? "conversation-sidebar__subitem--active" : ""}`}
                              onClick={() => {
                                onSelectSection("settings");
                                onSelectSettingsCategory("google");
                              }}
                              type="button"
                            >
                              <span className="conversation-sidebar__item-title">Google</span>
                              <span className="conversation-sidebar__item-meta">Provider online en preparation</span>
                            </button>
                            <button
                              className={`conversation-sidebar__subitem ${activeSettingsCategory === "mistral" ? "conversation-sidebar__subitem--active" : ""}`}
                              onClick={() => {
                                onSelectSection("settings");
                                onSelectSettingsCategory("mistral");
                              }}
                              type="button"
                            >
                              <span className="conversation-sidebar__item-title">Mistral</span>
                              <span className="conversation-sidebar__item-meta">Provider online en preparation</span>
                            </button>
                            <button
                              className={`conversation-sidebar__subitem ${activeSettingsCategory === "ollama" ? "conversation-sidebar__subitem--active" : ""}`}
                              onClick={() => {
                                onSelectSection("settings");
                                onSelectSettingsCategory("ollama");
                              }}
                              type="button"
                            >
                              <span className="conversation-sidebar__item-title">Ollama</span>
                              <span className="conversation-sidebar__item-meta">Provider local en preparation</span>
                            </button>
                            <button
                              className={`conversation-sidebar__subitem ${activeSettingsCategory === "lmstudio" ? "conversation-sidebar__subitem--active" : ""}`}
                              onClick={() => {
                                onSelectSection("settings");
                                onSelectSettingsCategory("lmstudio");
                              }}
                              type="button"
                            >
                              <span className="conversation-sidebar__item-title">LM Studio</span>
                              <span className="conversation-sidebar__item-meta">Provider local en preparation</span>
                            </button>
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
      </div>
    </aside>
  );
}
