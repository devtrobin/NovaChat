import { AppSettings } from "../../../../shared/settings.types";
import React from "react";
import { AgentDefinition } from "../../../services/workspace/workspace.types";
import { ActiveAgentTask, AgentContextFile, AgentWorkspaceData } from "../../../../shared/agent.types";
import "../../ChatPage/ChatPage.css";
import "../DeviceAgentPage/DeviceAgentPage.css";

type DiagnosticAgentPageProps = {
  agent: AgentDefinition;
  onSavedSettings: (settings: AppSettings) => void;
};

type DiagnosticAgentTab = "context" | "general";

export default function DiagnosticAgentPage({ agent, onSavedSettings }: DiagnosticAgentPageProps) {
  const [activeTab, setActiveTab] = React.useState<DiagnosticAgentTab>("general");
  const [activeTasks, setActiveTasks] = React.useState<ActiveAgentTask[]>([]);
  const [contextDraft, setContextDraft] = React.useState<AgentContextFile | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(agent.enabled);
  const [isBusy, setIsBusy] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [workspace, setWorkspace] = React.useState<AgentWorkspaceData | null>(null);

  const loadWorkspace = React.useCallback(async (options?: { preserveDraft?: boolean; silent?: boolean }) => {
    if (!options?.silent) setIsBusy(true);
    if (!options?.preserveDraft) setStatus("");
    const nextWorkspace = await window.nova.agents.loadWorkspace(agent.id);
    const settings = await window.nova.settings.load();
    setWorkspace(nextWorkspace);
    setIsEnabled(settings.agents[agent.id]?.enabled ?? true);
    if (!options?.preserveDraft) {
      setContextDraft(nextWorkspace.context);
    }
    if (!options?.silent) setIsBusy(false);
  }, [agent.id]);

  const loadActiveTasks = React.useCallback(async () => {
    const tasks = await window.nova.agents.getActiveTasks(agent.id);
    setActiveTasks(tasks);
  }, [agent.id]);

  React.useEffect(() => {
    let active = true;

    void loadWorkspace().catch(() => {
      if (active) setIsBusy(false);
    });
    void loadActiveTasks();
    const unsubscribe = window.nova.ai.onEvent(() => {
      window.setTimeout(() => {
        if (!active) return;
        void loadWorkspace({ preserveDraft: true, silent: true });
        void loadActiveTasks();
      }, 120);
    });
    const intervalId = window.setInterval(() => {
      if (!active) return;
      void loadActiveTasks();
    }, 1000);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [loadActiveTasks, loadWorkspace]);

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

  async function handleStopTask(taskId: string) {
    setIsBusy(true);
    setStatus("");
    try {
      await window.nova.agents.stopTask(taskId);
      setStatus("Tache agent interrompue.");
      const tasks = await window.nova.agents.getActiveTasks(agent.id);
      setActiveTasks(tasks);
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
                <p className="chat-page__placeholder-eyebrow">Etat</p>
                <p className="chat-page__placeholder-text">
                  Agent {isEnabled ? "actif" : "desactive"} · {activeTasks.length} tache{activeTasks.length > 1 ? "s" : ""} active{activeTasks.length > 1 ? "s" : ""}
                </p>
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
                {activeTasks.length ? (
                  <>
                    <p className="chat-page__placeholder-eyebrow">Taches actives</p>
                    <div className="device-agent-page__records">
                      {activeTasks.map((task) => (
                        <article className="device-agent-page__record-card" key={task.taskId}>
                          <div className="device-agent-page__record-head">
                            <span className="device-agent-page__badge device-agent-page__badge--success">En cours</span>
                            <span className="device-agent-page__record-date">{formatDate(task.startedAt)}</span>
                          </div>
                          <p className="device-agent-page__record-meta">{task.title}</p>
                          <pre className="device-agent-page__record-command">{task.request}</pre>
                          <div className="device-agent-page__record-actions">
                            <button className="device-agent-page__pill-button device-agent-page__pill-button--danger" disabled={isBusy} onClick={() => void handleStopTask(task.taskId)} type="button">
                              Arreter
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}
                {status ? <p className="settings-panel__status settings-panel__status--success">{status}</p> : null}
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}
