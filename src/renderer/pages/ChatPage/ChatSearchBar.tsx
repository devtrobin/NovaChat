import React from "react";

type ChatSearchBarProps = {
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  resultCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  selectedIndex: number;
};

export default function ChatSearchBar({
  onClose,
  onNext,
  onPrevious,
  onQueryChange,
  query,
  resultCount,
  searchInputRef,
  selectedIndex,
}: ChatSearchBarProps) {
  return (
    <div className="chat-page__search">
      <input
        className="chat-page__search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (event.shiftKey) {
            onPrevious();
            return;
          }
          onNext();
        }}
        placeholder="Rechercher dans cette conversation"
        ref={searchInputRef}
        type="text"
        value={query}
      />
      <span className="chat-page__search-count">
        {resultCount > 0 ? `${selectedIndex + 1}/${resultCount}` : "0"}
      </span>
      <div className="chat-page__search-actions">
        <button className="chat-page__search-button" disabled={resultCount === 0} onClick={onPrevious} type="button">↑</button>
        <button className="chat-page__search-button" disabled={resultCount === 0} onClick={onNext} type="button">↓</button>
        <button className="chat-page__search-close" onClick={onClose} type="button">Fermer</button>
      </div>
    </div>
  );
}
