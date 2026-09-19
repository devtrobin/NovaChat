import { AgentPageTab } from "../AgentPage.types";

type ACPAgentTabsProps = {
  activeTab: AgentPageTab;
  onSelect: (tab: AgentPageTab) => void;
};

const TABS: Array<{ label: string; value: AgentPageTab }> = [
  { label: "General", value: "general" },
  { label: "Contexte", value: "context" },
];

export default function ACPAgentTabs({
  activeTab,
  onSelect,
}: ACPAgentTabsProps) {
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
