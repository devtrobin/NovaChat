import { AgentPageTab } from "../AgentPage.types";

type PlannerAgentTabsProps = {
  activeTab: AgentPageTab;
  onSelect: (tab: AgentPageTab) => void;
};

const TABS: Array<{ label: string; value: AgentPageTab }> = [
  { label: "General", value: "general" },
  { label: "Contexte", value: "context" },
];

export default function PlannerAgentTabs({
  activeTab,
  onSelect,
}: PlannerAgentTabsProps) {
  return (
    <nav className="device-agent-page__tabs">
      {TABS.map((tab) => (
        <button
          className={`device-agent-page__tab${activeTab === tab.value ? " device-agent-page__tab--active" : ""}`}
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
