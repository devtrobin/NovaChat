import {
  ActiveAgentTask,
  AgentWorkspaceData,
} from "../../../../shared/agent.types";
import { AgentDefinition } from "../../../services/workspace/workspace.types";
import { AgentPageStatus } from "../AgentPage.types";
import { formatRecordDate } from "../DeviceAgentPage/DeviceAgentPage.service";

type PlannerAgentGeneralTabProps = {
  activeTasks: ActiveAgentTask[];
  agent: AgentDefinition;
  isBusy: boolean;
  isEnabled: boolean;
  onSetEnabled: (enabled: boolean) => Promise<void>;
  onStopTask: (taskId: string) => Promise<void>;
  status: AgentPageStatus;
  workspace: AgentWorkspaceData | null;
};

export default function PlannerAgentGeneralTab({
  activeTasks,
  agent,
  isBusy,
  isEnabled,
  onSetEnabled,
  onStopTask,
  status,
  workspace,
}: PlannerAgentGeneralTabProps) {
  return (
    <section className="device-agent-page__panel">
      <div className="chat-page__placeholder">
        <p className="chat-page__placeholder-eyebrow">Mission</p>
        <h2 className="chat-page__placeholder-title">{agent.mission}</h2>
        <p className="chat-page__placeholder-eyebrow">Description</p>
        <p className="chat-page__placeholder-text">
          {workspace?.context.description ?? agent.description}
        </p>
        <p className="chat-page__placeholder-eyebrow">Capacites</p>
        <p className="chat-page__placeholder-text">{agent.capabilities.join(" · ")}</p>
        <p className="chat-page__placeholder-eyebrow">Outils</p>
        <p className="chat-page__placeholder-text">{agent.tools.join(" · ")}</p>
        <p className="chat-page__placeholder-eyebrow">Etat</p>
        <p className="chat-page__placeholder-text">
          Agent {isEnabled ? "actif" : "desactive"} · {activeTasks.length} tache
          {activeTasks.length > 1 ? "s" : ""} active{activeTasks.length > 1 ? "s" : ""}
        </p>
        <p className="chat-page__placeholder-eyebrow">Activation</p>
        <div className="device-agent-page__toggle-row">
          <input
            checked={isEnabled}
            disabled={isBusy}
            onChange={(event) => void onSetEnabled(event.target.checked)}
            type="checkbox"
          />
          <span className="chat-page__placeholder-text">
            {isEnabled
              ? "L'assistant peut deleguer a cet agent."
              : "Aucune nouvelle delegation vers cet agent."}
          </span>
        </div>
        {activeTasks.length ? (
          <ActiveTaskList
            isBusy={isBusy}
            onStopTask={onStopTask}
            tasks={activeTasks}
          />
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

function ActiveTaskList({
  isBusy,
  onStopTask,
  tasks,
}: {
  isBusy: boolean;
  onStopTask: (taskId: string) => Promise<void>;
  tasks: ActiveAgentTask[];
}) {
  return (
    <>
      <p className="chat-page__placeholder-eyebrow">Taches actives</p>
      <div className="device-agent-page__records">
        {tasks.map((task) => (
          <article className="device-agent-page__record-card" key={task.taskId}>
            <div className="device-agent-page__record-head">
              <span className="device-agent-page__badge device-agent-page__badge--success">
                En cours
              </span>
              <span className="device-agent-page__record-date">
                {formatRecordDate(task.startedAt)}
              </span>
            </div>
            <p className="device-agent-page__record-meta">{task.title}</p>
            <pre className="device-agent-page__record-command">{task.request}</pre>
            <div className="device-agent-page__record-actions">
              <button
                className="device-agent-page__pill-button device-agent-page__pill-button--danger"
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
  );
}
