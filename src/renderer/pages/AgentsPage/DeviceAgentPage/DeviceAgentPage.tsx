import { AppSettings } from "../../../../shared/settings.types";
import React from "react";
import MessageList from "../../../components/MessageList/MessageList";
import { AgentDefinition } from "../../../services/workspace/workspace.types";
import {
  ActiveAgentTask,
  AgentContextFile,
  AgentHistoryEntry,
  AgentPermissionDecision,
  AgentPermissionRule,
  AgentWorkspaceData,
} from "../../../../shared/agent.types";
import "../../ChatPage/ChatPage.css";
import "./DeviceAgentPage.css";

type DeviceAgentPageProps = {
  agent: AgentDefinition;
  onSavedSettings: (settings: AppSettings) => void;
};

type DeviceAgentTab = "context" | "conversation" | "general" | "history" | "permissions";

export default function DeviceAgentPage({ agent, onSavedSettings }: DeviceAgentPageProps) {
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [activeTasks, setActiveTasks] = React.useState<ActiveAgentTask[]>([]);
  const [activeTab, setActiveTab] = React.useState<DeviceAgentTab>("general");
  const [contextDraft, setContextDraft] = React.useState<AgentContextFile | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(agent.enabled);
  const [isBusy, setIsBusy] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [workspace, setWorkspace] = React.useState<AgentWorkspaceData | null>(null);

  const loadWorkspace = React.useCallback(async (options?: { preserveDraft?: boolean; silent?: boolean }) => {
    if (!options?.silent) setIsBusy(true);
    if (!options?.preserveDraft) setStatus("");

    try {
      const nextWorkspace = await window.nova.agents.loadWorkspace(agent.id);
      const settings = await window.nova.settings.load();
      setWorkspace(nextWorkspace);
      setIsEnabled(settings.agents[agent.id]?.enabled ?? true);
      if (!options?.preserveDraft) {
        setContextDraft(nextWorkspace.context);
      }
      setActiveConversationId((current) => {
        if (current && nextWorkspace.conversations.conversations.some((conversation) => conversation.id === current)) {
          return current;
        }
        return nextWorkspace.conversations.activeConversationId ?? nextWorkspace.conversations.conversations[0]?.id ?? null;
      });
    } finally {
      if (!options?.silent) setIsBusy(false);
    }
  }, [agent.id]);

  const loadActiveTasks = React.useCallback(async () => {
    const tasks = await window.nova.agents.getActiveTasks(agent.id);
    setActiveTasks(tasks);
    setActiveTaskId((current) => tasks.some((task) => task.taskId === current) ? current : tasks[0]?.taskId ?? null);
  }, [agent.id]);

  React.useEffect(() => {
    let active = true;

    void loadWorkspace().catch(() => {
      if (active) setIsBusy(false);
    });

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

  React.useEffect(() => {
    void loadActiveTasks();
  }, [loadActiveTasks]);

  const activeConversation = React.useMemo(() => (
    workspace?.conversations.conversations.find((conversation) => conversation.id === activeConversationId) ?? null
  ), [activeConversationId, workspace?.conversations.conversations]);
  const activeTask = React.useMemo(() => (
    activeTasks.find((task) => task.taskId === activeTaskId) ?? null
  ), [activeTaskId, activeTasks]);

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

  async function handleSetPermission(command: string, decision: AgentPermissionDecision) {
    setIsBusy(true);
    setStatus("");
    try {
      const permissions = await window.nova.agents.savePermission(agent.id, command, decision, true);
      setWorkspace((current) => current ? { ...current, permissions } : current);
      setStatus(`Permission ${decision === "allow" ? "autorisee" : "refusee"} pour la commande selectionnee.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeletePermission(command: string) {
    setIsBusy(true);
    setStatus("");
    try {
      const permissions = await window.nova.agents.deletePermission(agent.id, command);
      setWorkspace((current) => current ? { ...current, permissions } : current);
      setStatus("Permission supprimee.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleOpenHistoryConversation(entry: AgentHistoryEntry) {
    setActiveConversationId(entry.agentConversationId);
    setActiveTaskId(null);
    setActiveTab("conversation");
  }

  async function handleStopTask(taskId: string) {
    setIsBusy(true);
    setStatus("");
    try {
      await window.nova.agents.stopTask(taskId);
      setStatus("Tache agent interrompue.");
      await loadActiveTasks();
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
            <TabButton activeTab={activeTab} onSelect={setActiveTab} value="general">General</TabButton>
            <TabButton activeTab={activeTab} onSelect={setActiveTab} value="conversation">Conversation</TabButton>
            <TabButton activeTab={activeTab} onSelect={setActiveTab} value="context">Contexte</TabButton>
            <TabButton activeTab={activeTab} onSelect={setActiveTab} value="permissions">Permissions</TabButton>
            <TabButton activeTab={activeTab} onSelect={setActiveTab} value="history">Historique</TabButton>
          </nav>

          {activeTab === "general" ? (
            <section className="device-agent-page__panel">
              <div className="chat-page__placeholder">
                <p className="chat-page__placeholder-eyebrow">Nom</p>
                <h2 className="chat-page__placeholder-title">{workspace?.context.name ?? agent.name}</h2>
                <p className="chat-page__placeholder-eyebrow">Description</p>
                <p className="chat-page__placeholder-text">{workspace?.context.description ?? agent.description}</p>
                <p className="chat-page__placeholder-eyebrow">Mission</p>
                <p className="chat-page__placeholder-text">{agent.mission}</p>
                <p className="chat-page__placeholder-eyebrow">Capacites</p>
                <p className="chat-page__placeholder-text">{agent.capabilities.join(" · ")}</p>
                <p className="chat-page__placeholder-eyebrow">Fonctionnalites</p>
                <p className="chat-page__placeholder-text">{agent.features.join(" · ")}</p>
                <p className="chat-page__placeholder-eyebrow">Processus</p>
                <p className="chat-page__placeholder-text">{agent.processes.join(" → ")}</p>
                <p className="chat-page__placeholder-eyebrow">Outils</p>
                <p className="chat-page__placeholder-text">{agent.tools.join(" · ")}</p>
                <p className="chat-page__placeholder-eyebrow">Etat</p>
                <p className="chat-page__placeholder-text">
                  Agent {isEnabled ? "actif" : "desactive"} ·{" "}
                  {workspace?.permissions.rules.length ?? 0} permission{(workspace?.permissions.rules.length ?? 0) > 1 ? "s" : ""} memorisee{(workspace?.permissions.rules.length ?? 0) > 1 ? "s" : ""} ·{" "}
                  {workspace?.history.length ?? 0} execution{(workspace?.history.length ?? 0) > 1 ? "s" : ""} journalisee{(workspace?.history.length ?? 0) > 1 ? "s" : ""}
                </p>
                <label className="settings-panel__field">
                  <span className="settings-panel__label">Activation</span>
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
                </label>
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
                    <p className="device-agent-page__conversation-note">Lecture seule. Rafraichissement live pendant les executions.</p>
                  </div>
                </div>
                <div className="device-agent-page__conversation-items">
                  {activeTasks.length ? (
                    <>
                      <p className="device-agent-page__conversation-note">Taches actives</p>
                      {activeTasks.map((task) => (
                        <div
                          key={task.taskId}
                          className={`device-agent-page__conversation-item${task.taskId === activeTaskId ? " device-agent-page__conversation-item--active" : ""}`}
                        >
                          <button
                            className="device-agent-page__conversation-select"
                            onClick={() => {
                              setActiveTaskId(task.taskId);
                              setActiveConversationId(null);
                            }}
                            type="button"
                          >
                            <span>{task.title}</span>
                            <span className="device-agent-page__conversation-meta">en cours</span>
                          </button>
                          <button className="device-agent-page__pill-button device-agent-page__pill-button--danger" disabled={isBusy} onClick={() => void handleStopTask(task.taskId)} type="button">
                            Arreter
                          </button>
                        </div>
                      ))}
                    </>
                  ) : null}
                  {workspace?.conversations.conversations.length ? workspace.conversations.conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      className={`device-agent-page__conversation-item${conversation.id === activeConversationId ? " device-agent-page__conversation-item--active" : ""}`}
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setActiveTaskId(null);
                      }}
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
                {activeTask ? (
                  <div className="chat-page__placeholder">
                    <p className="chat-page__placeholder-eyebrow">Tache en cours</p>
                    <h2 className="chat-page__placeholder-title">{activeTask.title}</h2>
                    <pre className="device-agent-page__record-command">{activeTask.request}</pre>
                    <p className="chat-page__placeholder-text">Cette procedure agent est encore active en memoire.</p>
                    <div className="device-agent-page__record-actions">
                      <button className="device-agent-page__pill-button device-agent-page__pill-button--danger" disabled={isBusy} onClick={() => void handleStopTask(activeTask.taskId)} type="button">
                        Arreter
                      </button>
                    </div>
                  </div>
                ) : activeConversation ? (
                  <MessageList messages={activeConversation.messages} />
                ) : (
                  <div className="chat-page__placeholder">
                    <p className="chat-page__placeholder-eyebrow">Conversation</p>
                    <h2 className="chat-page__placeholder-title">Aucune conversation</h2>
                    <p className="chat-page__placeholder-text">
                      Les echanges entre l&apos;assistant principal et l&apos;agent Device apparaitront ici.
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

          {activeTab === "permissions" ? (
            <section className="device-agent-page__panel">
              <div className="device-agent-page__context-head">
                <div>
                  <h3 className="device-agent-page__conversation-title">Permissions</h3>
                  <p className="device-agent-page__conversation-note">Regles exactes memorisees dans <code>permissions.json</code>.</p>
                </div>
              </div>
              <div className="device-agent-page__records">
                {workspace?.permissions.rules.length ? workspace.permissions.rules.map((rule) => (
                  <PermissionCard
                    key={rule.command}
                    isBusy={isBusy}
                    onAllow={() => void handleSetPermission(rule.command, "allow")}
                    onDelete={() => void handleDeletePermission(rule.command)}
                    onDeny={() => void handleSetPermission(rule.command, "deny")}
                    rule={rule}
                  />
                )) : (
                  <p className="device-agent-page__empty-state">Aucune permission memorisee pour le moment.</p>
                )}
                {status ? <p className="settings-panel__status settings-panel__status--success">{status}</p> : null}
              </div>
            </section>
          ) : null}

          {activeTab === "history" ? (
            <section className="device-agent-page__panel">
              <div className="device-agent-page__context-head">
                <div>
                  <h3 className="device-agent-page__conversation-title">Historique</h3>
                  <p className="device-agent-page__conversation-note">Executions journalisees dans <code>historique.json</code>.</p>
                </div>
              </div>
              <div className="device-agent-page__records">
                {workspace?.history.length ? workspace.history.map((entry) => (
                  <HistoryCard key={`${entry.at}-${entry.agentConversationId}`} entry={entry} onOpenConversation={handleOpenHistoryConversation} />
                )) : (
                  <p className="device-agent-page__empty-state">Aucune execution enregistree pour le moment.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function TabButton({
  activeTab,
  children,
  onSelect,
  value,
}: {
  activeTab: DeviceAgentTab;
  children: React.ReactNode;
  onSelect: (tab: DeviceAgentTab) => void;
  value: DeviceAgentTab;
}) {
  return (
    <button className={`device-agent-page__tab${activeTab === value ? " device-agent-page__tab--active" : ""}`} onClick={() => onSelect(value)} type="button">
      {children}
    </button>
  );
}

function PermissionCard({
  isBusy,
  onAllow,
  onDelete,
  onDeny,
  rule,
}: {
  isBusy: boolean;
  onAllow: () => void;
  onDelete: () => void;
  onDeny: () => void;
  rule: AgentPermissionRule;
}) {
  return (
    <article className="device-agent-page__record-card">
      <div className="device-agent-page__record-head">
        <span className={`device-agent-page__badge device-agent-page__badge--${rule.decision}`}>
          {rule.decision === "allow" ? "Autorisee" : "Refusee"}
        </span>
        <span className="device-agent-page__record-date">{formatDate(rule.createdAt)}</span>
      </div>
      <pre className="device-agent-page__record-command">{rule.command}</pre>
      <div className="device-agent-page__record-actions">
        <button className="device-agent-page__pill-button" disabled={isBusy} onClick={onAllow} type="button">Autoriser</button>
        <button className="device-agent-page__pill-button" disabled={isBusy} onClick={onDeny} type="button">Refuser</button>
        <button className="device-agent-page__pill-button device-agent-page__pill-button--danger" disabled={isBusy} onClick={onDelete} type="button">Supprimer</button>
      </div>
    </article>
  );
}

function HistoryCard({
  entry,
  onOpenConversation,
}: {
  entry: AgentHistoryEntry;
  onOpenConversation: (entry: AgentHistoryEntry) => void;
}) {
  return (
    <article className="device-agent-page__record-card">
      <div className="device-agent-page__record-head">
        <span className={`device-agent-page__badge device-agent-page__badge--${entry.status}`}>
          {entry.status === "success" ? "Succes" : entry.status === "denied" ? "Refus" : "Erreur"}
        </span>
        <span className="device-agent-page__record-date">{formatDate(entry.at)}</span>
      </div>
      <pre className="device-agent-page__record-command">{entry.command}</pre>
      <p className="device-agent-page__record-meta">
        Conversation agent : <code>{entry.agentConversationId}</code>
      </p>
      <p className="device-agent-page__record-meta">
        Conversation principale : <code>{entry.userAssistantConversationId}</code>
      </p>
      <p className="device-agent-page__record-meta">
        Message declencheur : <code>{entry.triggerMessageId}</code>
      </p>
      <pre className="device-agent-page__record-result">{truncate(entry.result)}</pre>
      <div className="device-agent-page__record-actions">
        <button className="device-agent-page__pill-button" onClick={() => onOpenConversation(entry)} type="button">
          Ouvrir la conversation agent
        </button>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}

function truncate(value: string): string {
  return value.length > 900 ? `${value.slice(0, 900)}\n\n[sortie tronquee: ${value.length - 900} caracteres masques]` : value;
}
