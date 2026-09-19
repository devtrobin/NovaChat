import { AgentHistoryEntry } from "../../../../shared/agent.types";
import {
  formatRecordDate,
  getHistoryStatusLabel,
  truncateRecordOutput,
} from "./AELAgentPage.service";

type AELAgentHistoryTabProps = {
  history: AgentHistoryEntry[];
};

export default function AELAgentHistoryTab({ history }: AELAgentHistoryTabProps) {
  return (
    <section className="agent-ael-page__panel">
      <div className="agent-ael-page__context-head">
        <div>
          <h3 className="agent-ael-page__conversation-title">Historique</h3>
          <p className="agent-ael-page__conversation-note">Executions journalisees dans <code>historique.json</code>.</p>
        </div>
      </div>
      <div className="agent-ael-page__records">
        {history.length ? history.map((entry) => (
          <HistoryCard key={`${entry.at}-${entry.agentConversationId}`} entry={entry} />
        )) : (
          <p className="agent-ael-page__empty-state">Aucune execution enregistree pour le moment.</p>
        )}
      </div>
    </section>
  );
}

function HistoryCard({ entry }: { entry: AgentHistoryEntry }) {
  return (
    <article className="agent-ael-page__record-card">
      <div className="agent-ael-page__record-head">
        <span className={`agent-ael-page__badge agent-ael-page__badge--${entry.status}`}>
          {getHistoryStatusLabel(entry.status)}
        </span>
        <span className="agent-ael-page__record-date">{formatRecordDate(entry.at)}</span>
      </div>
      <pre className="agent-ael-page__record-command">{entry.command}</pre>
      <p className="agent-ael-page__record-meta">
        Conversation agent : <code>{entry.agentConversationId}</code>
      </p>
      <p className="agent-ael-page__record-meta">
        Conversation principale : <code>{entry.userAssistantConversationId}</code>
      </p>
      <p className="agent-ael-page__record-meta">
        Message declencheur : <code>{entry.triggerMessageId}</code>
      </p>
      <pre className="agent-ael-page__record-result">{truncateRecordOutput(entry.result)}</pre>
    </article>
  );
}
