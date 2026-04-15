import { AgentDefinition } from "../../../services/workspace/workspace.types";
import "../../ChatPage/ChatPage.css";

type DeviceAgentPageProps = {
  agent: AgentDefinition;
};

export default function DeviceAgentPage({ agent }: DeviceAgentPageProps) {
  return (
    <section className="chat-page chat-page--static">
      <header className="chat-page__section-header">
        <div>
          <p className="chat-page__section-eyebrow">Agent Nova</p>
          <h1 className="chat-page__section-title">{agent.name}</h1>
        </div>
      </header>
      <section className="chat-page__content">
        <div className="chat-page__panel">
          <div className="chat-page__placeholder">
            <p className="chat-page__placeholder-eyebrow">Contexte</p>
            <h2 className="chat-page__placeholder-title">{agent.description}</h2>
            <p className="chat-page__placeholder-text">{agent.context}</p>
            <p className="chat-page__placeholder-eyebrow">Fonctionnalites</p>
            <p className="chat-page__placeholder-text">{agent.features.join(" · ")}</p>
            <p className="chat-page__placeholder-eyebrow">Processus</p>
            <p className="chat-page__placeholder-text">{agent.processes.join(" → ")}</p>
          </div>
        </div>
      </section>
    </section>
  );
}
