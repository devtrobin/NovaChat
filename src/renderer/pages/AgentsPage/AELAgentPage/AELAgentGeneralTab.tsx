import {
  ActiveAgentTask,
  AgentWorkspaceData,
} from "../../../../shared/agent.types";
import { AgentDefinition } from "../../../services/workspace/workspace.types";
import { formatRecordDate } from "./AELAgentPage.service";
import { AgentPageStatus } from "./AELAgentPage.types";

type AELAgentGeneralTabProps = {
  activeTasks: ActiveAgentTask[];
  agent: AgentDefinition;
  isBusy: boolean;
  isEnabled: boolean;
  onSetEnabled: (enabled: boolean) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  status: AgentPageStatus;
  workspace: AgentWorkspaceData | null;
};

export default function AELAgentGeneralTab({
  activeTasks,
  agent,
  isBusy,
  isEnabled,
  onSetEnabled,
  onStopTask,
  status,
  workspace,
}: AELAgentGeneralTabProps) {
  const permissionCount = workspace?.permissions.rules.length ?? 0;
  const historyCount = workspace?.history.length ?? 0;

  return (
    <section className="agent-ael-page__panel">
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
          {permissionCount} permission{permissionCount > 1 ? "s" : ""} memorisee{permissionCount > 1 ? "s" : ""} ·{" "}
          {historyCount} execution{historyCount > 1 ? "s" : ""} journalisee{historyCount > 1 ? "s" : ""} ·{" "}
          {activeTasks.length} tache{activeTasks.length > 1 ? "s" : ""} active{activeTasks.length > 1 ? "s" : ""}
        </p>
        <label className="settings-panel__field">
          <span className="settings-panel__label">Activation</span>
          <div className="agent-ael-page__toggle-row">
            <input
              checked={isEnabled}
              disabled={isBusy}
              onChange={(event) => void onSetEnabled(event.target.checked)}
              type="checkbox"
            />
            <span className="chat-page__placeholder-text">
              {isEnabled ? "L'assistant peut deleguer a cet agent." : "Aucune nouvelle delegation vers cet agent."}
            </span>
          </div>
        </label>
        {activeTasks.length ? (
          <>
            <p className="chat-page__placeholder-eyebrow">Taches actives</p>
            <div className="agent-ael-page__records">
              {activeTasks.map((task) => (
                <article className="agent-ael-page__record-card" key={task.taskId}>
                  <div className="agent-ael-page__record-head">
                    <span className="agent-ael-page__badge agent-ael-page__badge--success">En cours</span>
                    <span className="agent-ael-page__record-date">{formatRecordDate(task.startedAt)}</span>
                  </div>
                  <p className="agent-ael-page__record-meta">{task.title}</p>
                  <pre className="agent-ael-page__record-command">{task.request}</pre>
                  <div className="agent-ael-page__record-actions">
                    <button
                      className="agent-ael-page__pill-button agent-ael-page__pill-button--danger"
                      disabled={isBusy}
                      onClick={() => void onStopTask(task.taskId)}
                      type="button"
                    >
                      Arreter
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
        {status ? (
          <p className={`settings-panel__status settings-panel__status--${status.kind}`}>
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
