import React from "react";
import { Conversation } from "../../types/chat.types";
import { getConversationSearchMatches } from "../../services/chat/chat.service";

type UseConversationSearchResult = {
  goToNextSearchMatch: () => void;
  goToPreviousSearchMatch: () => void;
  isSearchOpen: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchMatches: string[];
  searchQuery: string;
  selectedSearchIndex: number;
  selectedSearchMessageId: string | null;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
};

export function useConversationSearch(activeConversation: Conversation | null): UseConversationSearchResult {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchMatches = React.useMemo(
    () => getConversationSearchMatches(activeConversation, searchQuery),
    [activeConversation, searchQuery],
  );
  const selectedSearchMessageId = searchMatches[selectedSearchIndex] ?? null;

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsSearchOpen(true);
        globalThis.setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 0);
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    setSelectedSearchIndex(0);
  }, [activeConversation?.id, searchQuery]);

  const goToNextSearchMatch = React.useCallback(() => {
    setSelectedSearchIndex((current) => (searchMatches.length === 0 ? 0 : (current + 1) % searchMatches.length));
  }, [searchMatches.length]);

  const goToPreviousSearchMatch = React.useCallback(() => {
    setSelectedSearchIndex((current) => (
      searchMatches.length === 0 ? 0 : (current - 1 + searchMatches.length) % searchMatches.length
    ));
  }, [searchMatches.length]);

  return {
    goToNextSearchMatch,
    goToPreviousSearchMatch,
    isSearchOpen,
    searchInputRef,
    searchMatches,
    searchQuery,
    selectedSearchIndex,
    selectedSearchMessageId,
    setIsSearchOpen,
    setSearchQuery,
  };
}
