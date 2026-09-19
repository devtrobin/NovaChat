import { AgentContextFile } from "../../../../shared/agent.types";
import { AgentPageStatus } from "./AELAgentPage.types";

type AELAgentContextTabProps = {
  contextDraft: AgentContextFile | null;
  isBusy: boolean;
  onChange: (context: AgentContextFile) => void;
  onSave: () => Promise<void>;
  status: AgentPageStatus;
};

type EditableContextField = "description" | "instructions" | "name";

export default function AELAgentContextTab({
  contextDraft,
  isBusy,
  onChange,
  onSave,
  status,
}: AELAgentContextTabProps) {
  function updateField(field: EditableContextField, value: string) {
    if (!contextDraft) return;
    onChange({ ...contextDraft, [field]: value });
  }

  return (
    <section className="agent-ael-page__panel">
      <div className="agent-ael-page__context-head">
        <div>
          <h3 className="agent-ael-page__conversation-title">Contexte de l&apos;agent</h3>
          <p className="agent-ael-page__conversation-note">Ce contenu sera enregistre dans <code>contexte.json</code>.</p>
        </div>
        <button
          className="agent-ael-page__save"
          disabled={isBusy || !contextDraft}
          onClick={() => void onSave()}
          type="button"
        >
          {isBusy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
      <div className="agent-ael-page__context-grid">
        <label className="settings-panel__field">
          <span className="settings-panel__label">Nom</span>
          <input
            className="settings-panel__input"
            disabled={isBusy || !contextDraft}
            onChange={(event) => updateField("name", event.target.value)}
            type="text"
            value={contextDraft?.name ?? ""}
          />
        </label>
        <label className="settings-panel__field">
          <span className="settings-panel__label">Description</span>
          <input
            className="settings-panel__input"
            disabled={isBusy || !contextDraft}
            onChange={(event) => updateField("description", event.target.value)}
            type="text"
            value={contextDraft?.description ?? ""}
          />
        </label>
        <label className="settings-panel__field">
          <span className="settings-panel__label">Instructions</span>
          <textarea
            className="agent-ael-page__textarea"
            disabled={isBusy || !contextDraft}
            onChange={(event) => updateField("instructions", event.target.value)}
            rows={14}
            value={contextDraft?.instructions ?? ""}
          />
        </label>
        {status ? (
          <p className={`settings-panel__status settings-panel__status--${status.kind}`}>
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
