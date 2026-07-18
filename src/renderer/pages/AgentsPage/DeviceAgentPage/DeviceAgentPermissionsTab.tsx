import {
  AgentPermissionDecision,
  AgentPermissionRule,
} from "../../../../shared/agent.types";
import { formatRecordDate } from "./DeviceAgentPage.service";

type DeviceAgentPermissionsTabProps = {
  isBusy: boolean;
  onDelete: (command: string) => Promise<void>;
  onSetPermission: (command: string, decision: AgentPermissionDecision) => Promise<void>;
  rules: AgentPermissionRule[];
  status: string;
};

export default function DeviceAgentPermissionsTab({
  isBusy,
  onDelete,
  onSetPermission,
  rules,
  status,
}: DeviceAgentPermissionsTabProps) {
  return (
    <section className="device-agent-page__panel">
      <div className="device-agent-page__context-head">
        <div>
          <h3 className="device-agent-page__conversation-title">Permissions</h3>
          <p className="device-agent-page__conversation-note">Regles exactes memorisees dans <code>permissions.json</code>.</p>
        </div>
      </div>
      <div className="device-agent-page__records">
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
          <p className="device-agent-page__empty-state">Aucune permission memorisee pour le moment.</p>
        )}
        {status ? <p className="settings-panel__status settings-panel__status--success">{status}</p> : null}
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
    <article className="device-agent-page__record-card">
      <div className="device-agent-page__record-head">
        <span className={`device-agent-page__badge device-agent-page__badge--${rule.decision}`}>
          {rule.decision === "allow" ? "Autorisee" : "Refusee"}
        </span>
        <span className="device-agent-page__record-date">{formatRecordDate(rule.createdAt)}</span>
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
