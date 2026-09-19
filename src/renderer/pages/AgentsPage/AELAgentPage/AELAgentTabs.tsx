import { AELAgentTab } from "./AELAgentPage.types";

type AELAgentTabsProps = {
  activeTab: AELAgentTab;
  onSelect: (tab: AELAgentTab) => void;
};

const TABS: Array<{ label: string; value: AELAgentTab }> = [
  { label: "General", value: "general" },
  { label: "Contexte", value: "context" },
  { label: "Permissions", value: "permissions" },
  { label: "Historique", value: "history" },
];

export default function AELAgentTabs({ activeTab, onSelect }: AELAgentTabsProps) {
  return (
    <nav className="agent-ael-page__tabs">
      {TABS.map((tab) => (
        <button
          className={`agent-ael-page__tab${activeTab === tab.value ? " agent-ael-page__tab--active" : ""}`}
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
