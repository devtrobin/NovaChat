import "./EmptyState.css";

export default function EmptyState() {
  return (
    <section className="empty-state">
      <div className="empty-state__card">
        <p className="empty-state__eyebrow">Nova Console</p>
        <h2 className="empty-state__title">Demarre une conversation</h2>
        <p className="empty-state__text">
          Selectionne un chat ou envoie un premier message pour initialiser une session calme,
          lisible et focalisee sur le travail.
        </p>
      </div>
    </section>
  );
}
