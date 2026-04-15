export default function AgentsPageEmpty() {
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
            <p className="chat-page__placeholder-eyebrow">Agents</p>
            <h2 className="chat-page__placeholder-title">Selectionnez un agent</h2>
            <p className="chat-page__placeholder-text">
              Chaque agent aura sa propre vue, son contexte et ses processus. Commence par choisir un agent dans la colonne de gauche.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
