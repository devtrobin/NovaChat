import React from "react";
import { TopBarProps } from "./TopBar.types";
import "./TopBar.css";

export default function TopBar({
  isDeletable,
  isEditable,
  onDelete,
  onRename,
  title,
}: TopBarProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title);

  React.useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  function handleSubmit() {
    onRename(draftTitle);
    setIsEditing(false);
  }

  return (
    <header className="top-bar">
      <div className="top-bar__heading">
        <p className="top-bar__eyebrow">Nova Interface Console</p>
        {isEditing ? (
          <input
            autoFocus
            className="top-bar__input"
            onBlur={handleSubmit}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
              if (event.key === "Escape") {
                setDraftTitle(title);
                setIsEditing(false);
              }
            }}
            value={draftTitle}
          />
        ) : (
          <button
            className={`top-bar__title-button ${isEditable ? "top-bar__title-button--editable" : ""}`}
            disabled={!isEditable}
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <h1 className="top-bar__title">{title}</h1>
            {isEditable ? <span className="top-bar__title-hint">Cliquer pour renommer</span> : null}
          </button>
        )}
      </div>
      <div className="top-bar__actions">
        {isDeletable ? (
          <button className="top-bar__delete" onClick={onDelete} type="button">
            Supprimer
          </button>
        ) : null}
        <div className="top-bar__status">
          <span className="top-bar__status-dot" />
          Session locale
        </div>
      </div>
    </header>
  );
}
