import { AppSettings } from "../../../../shared/settings.types";
import React from "react";
import MessageList from "../../../components/MessageList/MessageList";
import { AgentDefinition } from "../../../services/workspace/workspace.types";
import { AgentContextFile, AgentWorkspaceData } from "../../../../shared/agent.types";
import "../../ChatPage/ChatPage.css";
import "../DeviceAgentPage/DeviceAgentPage.css";

type DiagnosticAgentPageProps = {
  agent: AgentDefinition;
  onSavedSettings: (settings: AppSettings) => void;
};

type DiagnosticAgentTab = "context" | "conversation" | "general";

export default function DiagnosticAgentPage({ agent, onSavedSettings }: DiagnosticAgentPageProps) {
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<DiagnosticAgentTab>("general");
  const [contextDraft, setContextDraft] = React.useState<AgentContextFile | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(agent.enabled);
  const [isBusy, setIsBusy] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [workspace, setWorkspace] = React.useState<AgentWorkspaceData | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setIsBusy(true);
      setStatus("");
      try {
        const nextWorkspace = await window.nova.agents.loadWorkspace(agent.id);
        const settings = await window.nova.settings.load();
        if (!active) return;
        setWorkspace(nextWorkspace);
        setIsEnabled(settings.agents[agent.id]?.enabled ?? true);
        setContextDraft(nextWorkspace.context);
        setActiveConversationId(
          nextWorkspace.conversations.activeConversationId ?? nextWorkspace.conversations.conversations[0]?.id ?? null,
        );
      } finally {
        if (active) setIsBusy(false);
      }
    }

    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [agent.id]);

  const activeConversation = React.useMemo(() => (
    workspace?.conversations.conversations.find((conversation) => conversation.id === activeConversationId) ?? null
  ), [activeConversationId, workspace?.conversations.conversations]);

  async function handleSaveContext() {
    if (!contextDraft) return;
    setIsBusy(true);
    setStatus("");
    try {
      const savedContext = await window.nova.agents.saveContext(agent.id, contextDraft);
      setContextDraft(savedContext);
      setWorkspace((current) => current ? { ...current, context: savedContext } : current);
      setStatus("Contexte enregistre.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSetEnabled(nextEnabled: boolean) {
    setIsBusy(true);
    setStatus("");
    try {
      const settings = await window.nova.settings.load();
      const savedSettings = await window.nova.settings.save({
        ...settings,
        agents: {
          ...settings.agents,
          [agent.id]: {
            enabled: nextEnabled,
          },
        },
      });
      onSavedSettings(savedSettings);
      setIsEnabled(savedSettings.agents[agent.id]?.enabled ?? nextEnabled);
      setStatus(`Agent ${nextEnabled ? "active" : "desactive"}.`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="chat-page chat-page--static">
      <header className="chat-page__section-header">
        <div>
          <p className="chat-page__section-eyebrow">Agent Nova</p>
          <h1 className="chat-page__section-title">{agent.name}</h1>
        </div>
      </header>
      <section className="chat-page__content">
        <div className="chat-page__panel device-agent-page">
          <nav className="device-agent-page__tabs">
            <button className={`device-agent-page__tab${activeTab === "general" ? " device-agent-page__tab--active" : ""}`} onClick={() => setActiveTab("general")} type="button">
              General
            </button>
            <button className={`device-agent-page__tab${activeTab === "conversation" ? " device-agent-page__tab--active" : ""}`} onClick={() => setActiveTab("conversation")} type="button">
              Conversation
            </button>
            <button className={`device-agent-page__tab${activeTab === "context" ? " device-agent-page__tab--active" : ""}`} onClick={() => setActiveTab("context")} type="button">
              Contexte
            </button>
          </nav>

          {activeTab === "general" ? (
            <section className="device-agent-page__panel">
              <div className="chat-page__placeholder">
                <p className="chat-page__placeholder-eyebrow">Mission</p>
                <h2 className="chat-page__placeholder-title">{agent.mission}</h2>
                <p className="chat-page__placeholder-eyebrow">Description</p>
                <p className="chat-page__placeholder-text">{workspace?.context.description ?? agent.description}</p>
                <p className="chat-page__placeholder-eyebrow">Capacites</p>
                <p className="chat-page__placeholder-text">{agent.capabilities.join(" · ")}</p>
                <p className="chat-page__placeholder-eyebrow">Outils</p>
                <p className="chat-page__placeholder-text">{agent.tools.join(" · ")}</p>
                <p className="chat-page__placeholder-eyebrow">Activation</p>
                <div className="device-agent-page__toggle-row">
                  <input
                    checked={isEnabled}
                    disabled={isBusy}
                    onChange={(event) => void handleSetEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="chat-page__placeholder-text">
                    {isEnabled ? "L'assistant peut deleguer a cet agent." : "Aucune nouvelle delegation vers cet agent."}
                  </span>
                </div>
                {status ? <p className="settings-panel__status settings-panel__status--success">{status}</p> : null}
              </div>
            </section>
          ) : null}

          {activeTab === "conversation" ? (
            <section className="device-agent-page__conversation">
              <aside className="device-agent-page__conversation-list">
                <div className="device-agent-page__conversation-head">
                  <div>
                    <h3 className="device-agent-page__conversation-title">Conversations internes</h3>
                    <p className="device-agent-page__conversation-note">Lecture seule pour retracer les echanges avec l&apos;assistant principal.</p>
                  </div>
                </div>
                <div className="device-agent-page__conversation-items">
                  {workspace?.conversations.conversations.length ? workspace.conversations.conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      className={`device-agent-page__conversation-item${conversation.id === activeConversationId ? " device-agent-page__conversation-item--active" : ""}`}
                      onClick={() => setActiveConversationId(conversation.id)}
                      type="button"
                    >
                      <span>{conversation.title}</span>
                      <span className="device-agent-page__conversation-meta">{conversation.messages.length} message{conversation.messages.length > 1 ? "s" : ""}</span>
                    </button>
                  )) : (
                    <p className="device-agent-page__conversation-empty">Aucune conversation interne pour le moment.</p>
                  )}
                </div>
              </aside>
              <div className="device-agent-page__conversation-panel">
                {activeConversation ? (
                  <MessageList messages={activeConversation.messages} />
                ) : (
                  <div className="chat-page__placeholder">
                    <p className="chat-page__placeholder-eyebrow">Conversation</p>
                    <h2 className="chat-page__placeholder-title">Aucune conversation</h2>
                    <p className="chat-page__placeholder-text">
                      Les echanges entre l&apos;assistant principal et l&apos;agent Diagnostic apparaitront ici.
                    </p>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "context" ? (
            <section className="device-agent-page__panel">
              <div className="device-agent-page__context-head">
                <div>
                  <h3 className="device-agent-page__conversation-title">Contexte de l&apos;agent</h3>
                  <p className="device-agent-page__conversation-note">Ce contenu sera enregistre dans <code>contexte.json</code>.</p>
                </div>
                <button className="device-agent-page__save" disabled={isBusy || !contextDraft} onClick={() => void handleSaveContext()} type="button">
                  {isBusy ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
              <div className="device-agent-page__context-grid">
                <label className="settings-panel__field">
                  <span className="settings-panel__label">Nom</span>
                  <input
                    className="settings-panel__input"
                    disabled={isBusy || !contextDraft}
                    onChange={(event) => setContextDraft((current) => current ? { ...current, name: event.target.value } : current)}
                    type="text"
                    value={contextDraft?.name ?? ""}
                  />
                </label>
                <label className="settings-panel__field">
                  <span className="settings-panel__label">Description</span>
                  <input
                    className="settings-panel__input"
                    disabled={isBusy || !contextDraft}
                    onChange={(event) => setContextDraft((current) => current ? { ...current, description: event.target.value } : current)}
                    type="text"
                    value={contextDraft?.description ?? ""}
                  />
                </label>
                <label className="settings-panel__field">
                  <span className="settings-panel__label">Instructions</span>
                  <textarea
                    className="device-agent-page__textarea"
                    disabled={isBusy || !contextDraft}
                    onChange={(event) => setContextDraft((current) => current ? { ...current, instructions: event.target.value } : current)}
                    rows={14}
                    value={contextDraft?.instructions ?? ""}
                  />
                </label>
                {status ? <p className="settings-panel__status settings-panel__status--success">{status}</p> : null}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </section>
  );
}
