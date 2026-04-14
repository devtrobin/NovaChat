import React from "react";
import { AgentDefinition } from "../../services/workspace/workspace.types";
import "../ChatPage/ChatPage.css";

type AgentsPageProps = {
  activeAgent: AgentDefinition | null;
};

export default function AgentsPage({ activeAgent }: AgentsPageProps) {
  return (
    <section className="chat-page chat-page--static">
      <header className="chat-page__section-header">
        <div>
          <p className="chat-page__section-eyebrow">Nova Workspace</p>
          <h1 className="chat-page__section-title">Agents</h1>
        </div>
      </header>
      <section className="chat-page__content">
        <div className="chat-page__panel">
          <div className="chat-page__placeholder">
            <p className="chat-page__placeholder-eyebrow">Preview</p>
            <h2 className="chat-page__placeholder-title">
              {activeAgent?.name ?? "Selectionnez un agent"}
            </h2>
            <p className="chat-page__placeholder-text">
              Cette vue servira a construire le systeme d&apos;agents Nova. Pour l&apos;instant, l&apos;espace reste volontairement vide.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
