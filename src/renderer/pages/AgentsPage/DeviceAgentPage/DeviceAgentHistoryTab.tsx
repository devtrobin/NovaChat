import { AgentHistoryEntry } from "../../../../shared/agent.types";
import {
  formatRecordDate,
  getHistoryStatusLabel,
  truncateRecordOutput,
} from "./DeviceAgentPage.service";

type DeviceAgentHistoryTabProps = {
  history: AgentHistoryEntry[];
};

export default function DeviceAgentHistoryTab({ history }: DeviceAgentHistoryTabProps) {
  return (
    <section className="device-agent-page__panel">
      <div className="device-agent-page__context-head">
        <div>
          <h3 className="device-agent-page__conversation-title">Historique</h3>
          <p className="device-agent-page__conversation-note">Executions journalisees dans <code>historique.json</code>.</p>
        </div>
      </div>
      <div className="device-agent-page__records">
        {history.length ? history.map((entry) => (
          <HistoryCard key={`${entry.at}-${entry.agentConversationId}`} entry={entry} />
        )) : (
          <p className="device-agent-page__empty-state">Aucune execution enregistree pour le moment.</p>
        )}
      </div>
    </section>
  );
}

function HistoryCard({ entry }: { entry: AgentHistoryEntry }) {
  return (
    <article className="device-agent-page__record-card">
      <div className="device-agent-page__record-head">
        <span className={`device-agent-page__badge device-agent-page__badge--${entry.status}`}>
          {getHistoryStatusLabel(entry.status)}
        </span>
        <span className="device-agent-page__record-date">{formatRecordDate(entry.at)}</span>
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
      <pre className="device-agent-page__record-result">{truncateRecordOutput(entry.result)}</pre>
    </article>
  );
}
