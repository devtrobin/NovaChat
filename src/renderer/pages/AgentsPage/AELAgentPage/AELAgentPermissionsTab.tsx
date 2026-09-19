import {
  AgentPermissionDecision,
  AgentPermissionRule,
} from "../../../../shared/agent.types";
import { formatRecordDate } from "./AELAgentPage.service";
import { AgentPageStatus } from "./AELAgentPage.types";

type AELAgentPermissionsTabProps = {
  isBusy: boolean;
  onDelete: (command: string) => Promise<void>;
  onSetPermission: (command: string, decision: AgentPermissionDecision) => Promise<void>;
  rules: AgentPermissionRule[];
  status: AgentPageStatus;
};

export default function AELAgentPermissionsTab({
  isBusy,
  onDelete,
  onSetPermission,
  rules,
  status,
}: AELAgentPermissionsTabProps) {
  return (
    <section className="agent-ael-page__panel">
      <div className="agent-ael-page__context-head">
        <div>
          <h3 className="agent-ael-page__conversation-title">Permissions</h3>
          <p className="agent-ael-page__conversation-note">Regles exactes memorisees dans <code>permissions.json</code>.</p>
        </div>
      </div>
      <div className="agent-ael-page__records">
        {rules.length ? rules.map((rule) => (
          <PermissionCard
            key={rule.command}
            isBusy={isBusy}
            onAllow={() => void onSetPermission(rule.command, "allow")}
            onDelete={() => void onDelete(rule.command)}
            onDeny={() => void onSetPermission(rule.command, "deny")}
            rule={rule}
          />
        )) : (
          <p className="agent-ael-page__empty-state">Aucune permission memorisee pour le moment.</p>
        )}
      {status ? (
        <p className={`settings-panel__status settings-panel__status--${status.kind}`}>
          {status.message}
        </p>
      ) : null}
      </div>
    </section>
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
    <article className="agent-ael-page__record-card">
      <div className="agent-ael-page__record-head">
        <span className={`agent-ael-page__badge agent-ael-page__badge--${rule.decision}`}>
          {rule.decision === "allow" ? "Autorisee" : "Refusee"}
        </span>
        <span className="agent-ael-page__record-date">{formatRecordDate(rule.createdAt)}</span>
      </div>
      <pre className="agent-ael-page__record-command">{rule.command}</pre>
      <div className="agent-ael-page__record-actions">
        <button className="agent-ael-page__pill-button" disabled={isBusy} onClick={onAllow} type="button">Autoriser</button>
        <button className="agent-ael-page__pill-button" disabled={isBusy} onClick={onDeny} type="button">Refuser</button>
        <button className="agent-ael-page__pill-button agent-ael-page__pill-button--danger" disabled={isBusy} onClick={onDelete} type="button">Supprimer</button>
      </div>
    </article>
  );
}
