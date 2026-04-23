import "./AgentsPage.css";
import React from "react";
import { ActiveAgentTask, AgentHistoryEntry } from "../../../shared/agent.types";
import { AgentDefinition } from "../../services/workspace/workspace.types";

type AgentsActivityViewProps = {
  agents: AgentDefinition[];
  activeAgentId?: string | null;
  onOpenConversation?: (conversationId: string) => void;
  onSelectAgent?: (agentId: string) => void;
};

type ActivityHistoryEntry = AgentHistoryEntry & {
  agentId: AgentDefinition["id"];
};

export default function AgentsActivityView({
  activeAgentId = null,
  agents,
  onOpenConversation,
  onSelectAgent,
}: AgentsActivityViewProps) {
  const [activeTasks, setActiveTasks] = React.useState<ActiveAgentTask[]>([]);
  const [busyTaskId, setBusyTaskId] = React.useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = React.useState<ActivityHistoryEntry[]>([]);

  const loadActivity = React.useCallback(async () => {
    const [taskLists, workspaces] = await Promise.all([
      Promise.all(agents.map((agent) => window.nova.agents.getActiveTasks(agent.id))),
      Promise.all(agents.map((agent) => window.nova.agents.loadWorkspace(agent.id))),
    ]);

    setActiveTasks(taskLists.flat().sort((left, right) => right.startedAt.localeCompare(left.startedAt)));
    setHistoryEntries(
      workspaces.flatMap((workspace) => workspace.history.map((entry) => ({
        ...entry,
        agentId: workspace.id,
      }))).sort((left, right) => right.at.localeCompare(left.at)).slice(0, 24),
    );
  }, [agents]);

  React.useEffect(() => {
    let active = true;
    void loadActivity();

    const unsubscribe = window.nova.ai.onEvent(() => {
      window.setTimeout(() => {
        if (!active) return;
        void loadActivity();
      }, 120);
    });

    const intervalId = window.setInterval(() => {
      if (!active) return;
      void loadActivity();
    }, 1000);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [loadActivity]);

  async function handleStopTask(taskId: string) {
    setBusyTaskId(taskId);
    try {
      await window.nova.agents.stopTask(taskId);
      await loadActivity();
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <section className="agents-page__activity">
      <div className="agents-page__activity-head">
        <div>
          <p className="chat-page__section-eyebrow">Vue d'activite</p>
          <h2 className="agents-page__activity-title">Taches agents en cours</h2>
        </div>
        <span className="agents-page__activity-count">{activeTasks.length} active{activeTasks.length > 1 ? "s" : ""}</span>
      </div>
      {activeTasks.length ? (
        <div className="agents-page__activity-list">
          {activeTasks.map((task) => {
            const agent = agents.find((item) => item.id === task.agentId);
            return (
              <article key={task.taskId} className="agents-page__activity-card">
                <div className="agents-page__activity-card-head">
                  {onSelectAgent ? (
                    <button
                      className={`agents-page__activity-agent${activeAgentId === task.agentId ? " agents-page__activity-agent--active" : ""}`}
                      onClick={() => onSelectAgent(task.agentId)}
                      type="button"
                    >
                      {agent?.name ?? task.agentId}
                    </button>
                  ) : (
                    <span className={`agents-page__activity-agent${activeAgentId === task.agentId ? " agents-page__activity-agent--active" : ""}`}>
                      {agent?.name ?? task.agentId}
                    </span>
                  )}
                  <span className={`agents-page__history-badge agents-page__history-badge--${task.status}`}>
                    {formatActiveStatus(task.status)}
                  </span>
                </div>
                <p className="agents-page__history-meta">{formatDate(task.startedAt)}</p>
                <h3 className="agents-page__activity-card-title">{task.title}</h3>
                <pre className="agents-page__activity-request">{task.request}</pre>
                <div className="agents-page__activity-actions">
                  <button className="agents-page__activity-stop" disabled={busyTaskId === task.taskId} onClick={() => void handleStopTask(task.taskId)} type="button">
                    {busyTaskId === task.taskId ? "Arret..." : "Arreter"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="agents-page__activity-empty">Aucune tache agent active pour le moment.</p>
      )}

      <div className="agents-page__activity-head">
        <div>
          <p className="chat-page__section-eyebrow">Historique recent</p>
          <h2 className="agents-page__activity-title">Dernieres taches agents</h2>
        </div>
        <span className="agents-page__activity-count">{historyEntries.length} entree{historyEntries.length > 1 ? "s" : ""}</span>
      </div>
      {historyEntries.length ? (
        <div className="agents-page__history-list">
          {historyEntries.map((entry) => {
            const agent = agents.find((item) => item.id === entry.agentId);
            return (
              <article key={`${entry.agentId}-${entry.at}-${entry.agentConversationId}`} className="agents-page__history-card">
                <div className="agents-page__activity-card-head">
                  {onSelectAgent ? (
                    <button className="agents-page__activity-agent" onClick={() => onSelectAgent(entry.agentId)} type="button">
                      {agent?.name ?? entry.agentId}
                    </button>
                  ) : (
                    <span className="agents-page__activity-agent">{agent?.name ?? entry.agentId}</span>
                  )}
                  <span className={`agents-page__history-badge agents-page__history-badge--${entry.status}`}>
                    {formatStatus(entry.status)}
                  </span>
                </div>
                <p className="agents-page__history-meta">{formatDate(entry.at)}</p>
                <pre className="agents-page__activity-request">{entry.assistantRequest ?? entry.command}</pre>
                <div className="agents-page__history-links">
                  <span className="agents-page__history-link-label">Conversation source</span>
                  {onOpenConversation && entry.userAssistantConversationId ? (
                    <button className="agents-page__history-link" onClick={() => onOpenConversation(entry.userAssistantConversationId)} type="button">
                      Ouvrir la conversation source
                    </button>
                  ) : (
                    <code>{entry.userAssistantConversationId || "source indisponible"}</code>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="agents-page__activity-empty">Aucun historique agent disponible pour le moment.</p>
      )}
    </section>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function formatStatus(status: ActivityHistoryEntry["status"]): string {
  if (status === "success") return "Termine";
  if (status === "partial-success") return "Partiel";
  if (status === "denied") return "Refuse";
  if (status === "interrupted") return "Interrompu";
  return "Erreur";
}

function formatActiveStatus(status: ActiveAgentTask["status"]): string {
  if (status === "waiting-input") return "En attente";
  if (status === "waiting-permission") return "Permission";
  return "En cours";
}
